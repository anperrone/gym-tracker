import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
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
    expect(Object.keys(u ?? {}).sort()).toEqual([
      'createdAt',
      'disabledAt',
      'email',
      'id',
      'name',
      'role',
    ]);
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

describe('API admin — disabilitazione account', () => {
  it("disabilita un utente: il DTO lo segna e la sessione dell'utente è revocata", async () => {
    const admin = await seedUser('admin');
    const user = await seedUser('user');

    // Prima è attivo.
    expect((await app.request('/api/me', { headers: { Cookie: user.cookie } }, env)).status).toBe(
      200,
    );

    const res = await adminReq(`/users/${user.userId}/disabled`, admin.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ disabled: true }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as AdminUserDto).disabledAt).not.toBeNull();

    // La sessione esistente non è più valida (revocata o bloccata).
    const blocked = await app.request('/api/me', { headers: { Cookie: user.cookie } }, env);
    expect([401, 403]).toContain(blocked.status);
  });

  it('requireAuth blocca (403) un utente disabilitato e ne invalida la sessione', async () => {
    const user = await seedUser('user');
    // Disabilita direttamente nel DB mantenendo la sessione, per colpire il middleware.
    const db = createDb(env.DB);
    await db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, user.userId));

    const first = await app.request('/api/me', { headers: { Cookie: user.cookie } }, env);
    expect(first.status).toBe(403);

    // La sessione è stata invalidata: ora la stessa richiesta è 401 (sessione assente).
    const second = await app.request('/api/me', { headers: { Cookie: user.cookie } }, env);
    expect(second.status).toBe(401);
  });

  it('riabilita un utente: con una nuova sessione torna ad accedere', async () => {
    const admin = await seedUser('admin');
    const user = await seedUser('user');

    await adminReq(`/users/${user.userId}/disabled`, admin.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ disabled: true }),
    });
    const res = await adminReq(`/users/${user.userId}/disabled`, admin.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ disabled: false }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as AdminUserDto).disabledAt).toBeNull();

    // Nuova sessione (la precedente era stata revocata) → accesso ok.
    const token = await createSession(createDb(env.DB), user.userId);
    const ok = await app.request('/api/me', { headers: { Cookie: `session=${token}` } }, env);
    expect(ok.status).toBe(200);
  });

  it('un admin non può disabilitare sé stesso (409)', async () => {
    const admin = await seedUser('admin');
    const res = await adminReq(`/users/${admin.userId}/disabled`, admin.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ disabled: true }),
    });
    expect(res.status).toBe(409);
    // Resta operativo.
    expect((await adminReq('/users', admin.cookie)).status).toBe(200);
  });

  it('nega la disabilitazione ai non-admin (403)', async () => {
    const attacker = await seedUser('user');
    const victim = await seedUser('user');
    const res = await adminReq(`/users/${victim.userId}/disabled`, attacker.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ disabled: true }),
    });
    expect(res.status).toBe(403);
  });

  it('disabilitazione di un utente inesistente → 404', async () => {
    const admin = await seedUser('admin');
    const res = await adminReq('/users/non-esiste/disabled', admin.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ disabled: true }),
    });
    expect(res.status).toBe(404);
  });
});
