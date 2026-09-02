import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../src/server';
import { createSession } from '../../src/server/auth/session';
import { createDb } from '../../src/server/db/client';
import { users } from '../../src/server/db/schema';
import type { ExerciseDto } from '../../src/shared/schemas';

async function seedUser(role: 'user' | 'admin'): Promise<{ userId: string; cookie: string }> {
  const db = createDb(env.DB);
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, googleSub: `s-${userId}`, email: `${userId}@example.com`, role });
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

describe('API admin — catalogo globale', () => {
  it('richiede autenticazione (401)', async () => {
    const res = await app.request('/api/admin/exercises', {}, env);
    expect(res.status).toBe(401);
  });

  it('nega agli utenti standard (403)', async () => {
    const { cookie } = await seedUser('user');
    expect((await adminReq('/exercises', cookie)).status).toBe(403);
    expect(
      (
        await adminReq('/exercises', cookie, {
          method: 'POST',
          body: JSON.stringify({ name: 'X' }),
        })
      ).status,
    ).toBe(403);
  });

  it('GET elenca solo il catalogo globale', async () => {
    const { cookie } = await seedUser('admin');
    const res = await adminReq('/exercises', cookie);
    expect(res.status).toBe(200);
    const rows = (await res.json()) as ExerciseDto[];
    expect(rows.length).toBe(60);
    expect(rows.every((e) => e.isCustom === false)).toBe(true);
  });

  it('POST crea un esercizio globale visibile a tutti gli utenti', async () => {
    const admin = await seedUser('admin');
    const user = await seedUser('user');
    const res = await adminReq('/exercises', admin.cookie, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Hack Squat',
        equipment: 'machine',
        muscleGroup: 'Quadricipiti',
      }),
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as ExerciseDto;
    expect(created.isCustom).toBe(false);
    expect(created.name).toBe('Hack Squat');
    expect(created.muscleGroup).toBe('Quadricipiti');

    // Il catalogo globale è visibile a un utente standard.
    const list = await app.request('/api/exercises', { headers: { Cookie: user.cookie } }, env);
    const rows = (await list.json()) as ExerciseDto[];
    expect(rows.some((e) => e.id === created.id && e.isCustom === false)).toBe(true);
  });

  it('PATCH modifica un esercizio globale', async () => {
    const admin = await seedUser('admin');
    const created = (await (
      await adminReq('/exercises', admin.cookie, {
        method: 'POST',
        body: JSON.stringify({ name: 'Tmp', equipment: 'cable' }),
      })
    ).json()) as ExerciseDto;

    const res = await adminReq(`/exercises/${created.id}`, admin.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Pulley basso', muscleGroup: 'Dorso' }),
    });
    expect(res.status).toBe(200);
    const updated = (await res.json()) as ExerciseDto;
    expect(updated.name).toBe('Pulley basso');
    expect(updated.muscleGroup).toBe('Dorso');
    expect(updated.equipment).toBe('cable');
  });

  it('DELETE elimina un esercizio globale', async () => {
    const admin = await seedUser('admin');
    const created = (await (
      await adminReq('/exercises', admin.cookie, {
        method: 'POST',
        body: JSON.stringify({ name: 'Da eliminare', equipment: 'other' }),
      })
    ).json()) as ExerciseDto;

    expect(
      (await adminReq(`/exercises/${created.id}`, admin.cookie, { method: 'DELETE' })).status,
    ).toBe(200);

    const list = (await (await adminReq('/exercises', admin.cookie)).json()) as ExerciseDto[];
    expect(list.some((e) => e.id === created.id)).toBe(false);
  });

  it('non tocca gli esercizi custom degli utenti (404)', async () => {
    const admin = await seedUser('admin');
    const user = await seedUser('user');
    // L'utente crea un proprio esercizio custom.
    const custom = (await (
      await app.request(
        '/api/exercises',
        {
          method: 'POST',
          headers: { Cookie: user.cookie, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Custom di utente', equipment: 'dumbbell' }),
        },
        env,
      )
    ).json()) as ExerciseDto;

    const patch = await adminReq(`/exercises/${custom.id}`, admin.cookie, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hijack' }),
    });
    expect(patch.status).toBe(404);

    const del = await adminReq(`/exercises/${custom.id}`, admin.cookie, { method: 'DELETE' });
    expect(del.status).toBe(404);

    // Il custom dell'utente resta intatto.
    const still = (await (
      await app.request('/api/exercises', { headers: { Cookie: user.cookie } }, env)
    ).json()) as ExerciseDto[];
    expect(still.find((e) => e.id === custom.id)?.name).toBe('Custom di utente');
  });
});
