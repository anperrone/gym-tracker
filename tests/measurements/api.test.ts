import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../src/server';
import { createSession } from '../../src/server/auth/session';
import { createDb } from '../../src/server/db/client';
import { users } from '../../src/server/db/schema';

async function seedUserWithSession(): Promise<{ userId: string; cookie: string }> {
  const db = createDb(env.DB);
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, googleSub: `s-${userId}`, email: `${userId}@example.com` });
  const token = await createSession(db, userId);
  return { userId, cookie: `session=${token}` };
}

function post(cookie: string, body: unknown) {
  return app.request(
    '/api/measurements',
    {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    env,
  );
}

describe('API misure', () => {
  it('richiede autenticazione', async () => {
    const res = await app.request('/api/measurements', {}, env);
    expect(res.status).toBe(401);
  });

  it('GET /types restituisce le 9 metriche default', async () => {
    const { cookie } = await seedUserWithSession();
    const res = await app.request('/api/measurements/types', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    const types = (await res.json()) as { key: string }[];
    expect(types.length).toBe(9);
    expect(types.some((t) => t.key === 'weight')).toBe(true);
  });

  it('crea e rilegge una misurazione con i valori', async () => {
    const { cookie } = await seedUserWithSession();
    const create = await post(cookie, {
      measuredAt: '2026-09-01',
      values: [
        { typeId: 'mt_weight', value: 66.9 },
        { typeId: 'mt_waist', value: 75.5 },
      ],
    });
    expect(create.status).toBe(201);

    const list = await app.request('/api/measurements', { headers: { Cookie: cookie } }, env);
    const entries = (await list.json()) as { values: { typeId: string; value: number }[] }[];
    expect(entries.length).toBe(1);
    expect(entries[0].values).toHaveLength(2);
  });

  it('rifiuta typeId non validi (400)', async () => {
    const { cookie } = await seedUserWithSession();
    const res = await post(cookie, {
      measuredAt: '2026-09-01',
      values: [{ typeId: 'mt_inesistente', value: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it('isola i dati tra utenti', async () => {
    const a = await seedUserWithSession();
    const b = await seedUserWithSession();
    const create = await post(a.cookie, {
      measuredAt: '2026-09-01',
      values: [{ typeId: 'mt_weight', value: 70 }],
    });
    const { id } = (await create.json()) as { id: string };

    // B non vede le misurazioni di A
    const listB = await app.request('/api/measurements', { headers: { Cookie: b.cookie } }, env);
    expect((await listB.json()) as unknown[]).toHaveLength(0);

    // B non può eliminare la misurazione di A
    const delB = await app.request(
      `/api/measurements/${id}`,
      { method: 'DELETE', headers: { Cookie: b.cookie } },
      env,
    );
    expect(delB.status).toBe(404);

    // A la elimina
    const delA = await app.request(
      `/api/measurements/${id}`,
      { method: 'DELETE', headers: { Cookie: a.cookie } },
      env,
    );
    expect(delA.status).toBe(200);
  });

  it('GET /series/:typeId restituisce la serie temporale', async () => {
    const { cookie } = await seedUserWithSession();
    await post(cookie, { measuredAt: '2026-08-01', values: [{ typeId: 'mt_weight', value: 68 }] });
    await post(cookie, {
      measuredAt: '2026-09-01',
      values: [{ typeId: 'mt_weight', value: 66.9 }],
    });

    const res = await app.request(
      '/api/measurements/series/mt_weight',
      { headers: { Cookie: cookie } },
      env,
    );
    const points = (await res.json()) as { date: string; value: number }[];
    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(68); // ordine crescente per data
  });
});
