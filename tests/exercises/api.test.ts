import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../src/server';
import { createSession } from '../../src/server/auth/session';
import { createDb } from '../../src/server/db/client';
import { users } from '../../src/server/db/schema';
import type { ExerciseDto } from '../../src/shared/schemas';

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
    '/api/exercises',
    {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    env,
  );
}

describe('API esercizi', () => {
  it('richiede autenticazione', async () => {
    const res = await app.request('/api/exercises', {}, env);
    expect(res.status).toBe(401);
  });

  it('GET / restituisce il catalogo globale', async () => {
    const { cookie } = await seedUserWithSession();
    const res = await app.request('/api/exercises', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    const rows = (await res.json()) as ExerciseDto[];
    expect(rows.length).toBe(60);
    expect(rows.every((e) => e.isCustom === false)).toBe(true);
  });

  it('filtra per search ed equipment', async () => {
    const { cookie } = await seedUserWithSession();

    const byEquip = await app.request(
      '/api/exercises?equipment=barbell',
      { headers: { Cookie: cookie } },
      env,
    );
    const barbell = (await byEquip.json()) as ExerciseDto[];
    expect(barbell.length).toBe(13);
    expect(barbell.every((e) => e.equipment === 'barbell')).toBe(true);

    const bySearch = await app.request(
      '/api/exercises?search=squat',
      { headers: { Cookie: cookie } },
      env,
    );
    const squats = (await bySearch.json()) as ExerciseDto[];
    expect(squats.length).toBeGreaterThan(0);
    expect(squats.every((e) => e.name.toLowerCase().includes('squat'))).toBe(true);
  });

  it('tratta i metacaratteri LIKE come testo letterale', async () => {
    const { cookie } = await seedUserWithSession();
    // `_` è un carattere letterale, non un jolly: "leg_press" non matcha "Leg Press".
    const underscore = await app.request(
      '/api/exercises?search=leg_press',
      { headers: { Cookie: cookie } },
      env,
    );
    expect((await underscore.json()) as ExerciseDto[]).toHaveLength(0);

    // `%` letterale: nessun esercizio del seed lo contiene.
    const percent = await app.request(
      '/api/exercises?search=%25',
      { headers: { Cookie: cookie } },
      env,
    );
    expect((await percent.json()) as ExerciseDto[]).toHaveLength(0);
  });

  it('rifiuta equipment non valido (400)', async () => {
    const { cookie } = await seedUserWithSession();
    const res = await app.request(
      '/api/exercises?equipment=nope',
      { headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(400);
  });

  it('crea un esercizio custom a testo libero', async () => {
    const { cookie } = await seedUserWithSession();
    const res = await post(cookie, { name: 'Sissy Squat', equipment: 'bodyweight' });
    expect(res.status).toBe(201);
    const created = (await res.json()) as ExerciseDto;
    expect(created.isCustom).toBe(true);
    expect(created.name).toBe('Sissy Squat');

    // Compare nell'elenco dell'utente.
    const list = await app.request('/api/exercises', { headers: { Cookie: cookie } }, env);
    const rows = (await list.json()) as ExerciseDto[];
    expect(rows.some((e) => e.id === created.id && e.isCustom)).toBe(true);
    expect(rows.length).toBe(61);
  });

  it('collega e scollega un custom a una voce canonica', async () => {
    const { cookie } = await seedUserWithSession();
    const created = (await (await post(cookie, { name: 'Squat mia' })).json()) as ExerciseDto;

    const link = await app.request(
      `/api/exercises/${created.id}`,
      {
        method: 'PATCH',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonicalExerciseId: 'ex_squat' }),
      },
      env,
    );
    expect(link.status).toBe(200);
    expect(((await link.json()) as ExerciseDto).canonicalExerciseId).toBe('ex_squat');

    const unlink = await app.request(
      `/api/exercises/${created.id}`,
      {
        method: 'PATCH',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonicalExerciseId: null }),
      },
      env,
    );
    expect(((await unlink.json()) as ExerciseDto).canonicalExerciseId).toBeNull();
  });

  it('rifiuta una canonica inesistente (400)', async () => {
    const { cookie } = await seedUserWithSession();
    const res = await post(cookie, { name: 'X', canonicalExerciseId: 'ex_inesistente' });
    expect(res.status).toBe(400);
  });

  it('rifiuta una canonica non globale: no link custom→custom (400)', async () => {
    const { cookie } = await seedUserWithSession();
    const other = (await (await post(cookie, { name: 'Altro custom' })).json()) as ExerciseDto;

    // In creazione: canonica = un custom → rifiutata.
    const create = await post(cookie, { name: 'Y', canonicalExerciseId: other.id });
    expect(create.status).toBe(400);

    // In update: PATCH verso un custom → rifiutato (niente self-link né cicli).
    const target = (await (await post(cookie, { name: 'Z' })).json()) as ExerciseDto;
    const patch = await app.request(
      `/api/exercises/${target.id}`,
      {
        method: 'PATCH',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonicalExerciseId: other.id }),
      },
      env,
    );
    expect(patch.status).toBe(400);

    // Self-link → rifiutato.
    const selfLink = await app.request(
      `/api/exercises/${target.id}`,
      {
        method: 'PATCH',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonicalExerciseId: target.id }),
      },
      env,
    );
    expect(selfLink.status).toBe(400);
  });

  it('isola gli esercizi custom tra utenti', async () => {
    const a = await seedUserWithSession();
    const b = await seedUserWithSession();
    const created = (await (await post(a.cookie, { name: 'Solo di A' })).json()) as ExerciseDto;

    // B non vede il custom di A (vede solo i 60 globali).
    const listB = await app.request('/api/exercises', { headers: { Cookie: b.cookie } }, env);
    const rowsB = (await listB.json()) as ExerciseDto[];
    expect(rowsB.some((e) => e.id === created.id)).toBe(false);
    expect(rowsB.length).toBe(60);

    // B non può modificare né eliminare il custom di A.
    const patchB = await app.request(
      `/api/exercises/${created.id}`,
      {
        method: 'PATCH',
        headers: { Cookie: b.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonicalExerciseId: 'ex_squat' }),
      },
      env,
    );
    expect(patchB.status).toBe(404);

    const delB = await app.request(
      `/api/exercises/${created.id}`,
      { method: 'DELETE', headers: { Cookie: b.cookie } },
      env,
    );
    expect(delB.status).toBe(404);

    // A elimina il proprio custom.
    const delA = await app.request(
      `/api/exercises/${created.id}`,
      { method: 'DELETE', headers: { Cookie: a.cookie } },
      env,
    );
    expect(delA.status).toBe(200);
  });

  it('non consente di eliminare un esercizio globale', async () => {
    const { cookie } = await seedUserWithSession();
    const res = await app.request(
      '/api/exercises/ex_squat',
      { method: 'DELETE', headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(404);
  });
});
