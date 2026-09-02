import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../src/server';
import { createSession } from '../../src/server/auth/session';
import { createDb } from '../../src/server/db/client';
import { measurementEntries, users } from '../../src/server/db/schema';
import type { AdminUserDto, MeasurementEntryDto } from '../../src/shared/schemas';

async function seedUser(
  role: 'user' | 'admin',
  email?: string,
): Promise<{ userId: string; cookie: string }> {
  const db = createDb(env.DB);
  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    googleSub: `s-${userId}`,
    email: email ?? `${userId}@example.com`,
    role,
  });
  const token = await createSession(db, userId);
  return { userId, cookie: `session=${token}` };
}

function adminReq(path: string, cookie: string, init: RequestInit = {}) {
  return app.request(
    `/api/admin${path}`,
    {
      ...init,
      headers: { Cookie: cookie, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    },
    env,
  );
}

describe('API admin — utenti/ruoli', () => {
  it('nega la lista utenti ai non-admin (403)', async () => {
    const { cookie } = await seedUser('user');
    expect((await adminReq('/users', cookie)).status).toBe(403);
  });

  it('GET /users elenca gli utenti senza dati personali', async () => {
    const admin = await seedUser('admin', 'admin@example.com');
    const user = await seedUser('user', 'user@example.com');

    const res = await adminReq('/users', admin.cookie);
    expect(res.status).toBe(200);
    const rows = (await res.json()) as AdminUserDto[];

    // Entrambi gli utenti seed sono presenti (find per id: robusto allo stato condiviso tra test).
    expect(rows.find((r) => r.id === admin.userId)?.role).toBe('admin');
    const u = rows.find((r) => r.id === user.userId);
    expect(u?.email).toBe('user@example.com');
    expect(u?.role).toBe('user');
    // Il DTO espone solo campi non personali: niente misure/allenamenti.
    expect(Object.keys(u ?? {}).sort()).toEqual(['createdAt', 'email', 'id', 'name', 'role']);
  });

  it('PATCH /users/:id promuove un utente ad admin', async () => {
    const admin = await seedUser('admin');
    const user = await seedUser('user');

    const res = await adminReq(`/users/${user.userId}`, admin.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'admin' }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as AdminUserDto).role).toBe('admin');

    // L'ex-utente ora accede alle rotte admin.
    expect((await adminReq('/users', user.cookie)).status).toBe(200);
  });

  it('PATCH /users/:id rifiuta un ruolo non valido (400)', async () => {
    const admin = await seedUser('admin');
    const user = await seedUser('user');
    const res = await adminReq(`/users/${user.userId}`, admin.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'superuser' }),
    });
    expect(res.status).toBe(400);
  });

  it('un admin non può cambiare il proprio ruolo (409)', async () => {
    const admin = await seedUser('admin');
    const res = await adminReq(`/users/${admin.userId}`, admin.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'user' }),
    });
    expect(res.status).toBe(409);
    // Resta admin: continua ad accedere alle rotte admin.
    expect((await adminReq('/users', admin.cookie)).status).toBe(200);
  });

  it('PATCH su utente inesistente → 404', async () => {
    const admin = await seedUser('admin');
    const res = await adminReq('/users/non-esiste', admin.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'admin' }),
    });
    expect(res.status).toBe(404);
  });

  it('un admin non può leggere i dati personali di un utente', async () => {
    const admin = await seedUser('admin');
    const user = await seedUser('user');

    // L'utente ha una misurazione personale.
    const db = createDb(env.DB);
    await db.insert(measurementEntries).values({
      id: crypto.randomUUID(),
      userId: user.userId,
      measuredAt: new Date('2026-01-01'),
    });

    // L'utente la vede…
    const own = await app.request('/api/measurements', { headers: { Cookie: user.cookie } }, env);
    expect(((await own.json()) as MeasurementEntryDto[]).length).toBe(1);

    // …l'admin no: la lista è scoped alla propria sessione.
    const asAdmin = await app.request(
      '/api/measurements',
      { headers: { Cookie: admin.cookie } },
      env,
    );
    expect(((await asAdmin.json()) as MeasurementEntryDto[]).length).toBe(0);

    // Non esiste alcuna rotta admin per i dati personali di un utente.
    expect((await adminReq(`/users/${user.userId}/measurements`, admin.cookie)).status).toBe(404);
    expect((await adminReq(`/users/${user.userId}/sessions`, admin.cookie)).status).toBe(404);
  });
});
