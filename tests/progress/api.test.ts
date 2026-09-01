import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../src/server';
import { createSession } from '../../src/server/auth/session';
import { createDb } from '../../src/server/db/client';
import { sessionExercises, sessionSets, users, workoutSessions } from '../../src/server/db/schema';
import type { ProgressExerciseDto, ProgressPointDto } from '../../src/shared/schemas';

async function seedUserWithSession(): Promise<{ userId: string; cookie: string }> {
  const db = createDb(env.DB);
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, googleSub: `s-${userId}`, email: `${userId}@example.com` });
  const token = await createSession(db, userId);
  return { userId, cookie: `session=${token}` };
}

/** Logga una sessione (data) con un esercizio e le serie [peso,reps]. */
async function logSession(
  userId: string,
  exerciseId: string,
  performedAt: Date,
  sets: [number, number][],
) {
  const db = createDb(env.DB);
  const sessionId = crypto.randomUUID();
  await db.insert(workoutSessions).values({ id: sessionId, userId, performedAt });
  const seId = crypto.randomUUID();
  await db.insert(sessionExercises).values({
    id: seId,
    workoutSessionId: sessionId,
    exerciseId,
    exerciseName: 'Squat',
    equipment: 'barbell',
  });
  await db.insert(sessionSets).values(
    sets.map(([weight, reps], i) => ({
      id: crypto.randomUUID(),
      sessionExerciseId: seId,
      setNumber: i + 1,
      weight,
      reps,
    })),
  );
}

describe('API progressi', () => {
  it('richiede autenticazione', async () => {
    expect((await app.request('/api/progress/exercises', {}, env)).status).toBe(401);
  });

  it('elenca gli esercizi loggati con peso max e 1RM migliore', async () => {
    const { userId, cookie } = await seedUserWithSession();
    await logSession(userId, 'ex_squat', new Date('2026-01-01'), [
      [60, 12],
      [70, 10],
      [80, 8],
    ]);

    const res = await app.request('/api/progress/exercises', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    const rows = (await res.json()) as ProgressExerciseDto[];
    expect(rows).toHaveLength(1);
    expect(rows[0].exerciseId).toBe('ex_squat');
    expect(rows[0].sessionCount).toBe(1);
    expect(rows[0].bestWeight).toBe(80);
    // best 1RM = max(80·(1+8/30)=101.33 ; 70·1.333=93.3 ; 60·1.4=84) = 101.3
    expect(rows[0].best1RM).toBe(101.3);
    // lastPerformedAt = data della sessione (conversione secondi→ms corretta)
    expect(rows[0].lastPerformedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('restituisce la progressione per esercizio (per sessione, crescente)', async () => {
    const { userId, cookie } = await seedUserWithSession();
    await logSession(userId, 'ex_squat', new Date('2026-01-01'), [[60, 10]]);
    await logSession(userId, 'ex_squat', new Date('2026-02-01'), [
      [70, 10],
      [80, 5],
    ]);

    const res = await app.request(
      '/api/progress/exercises/ex_squat',
      { headers: { Cookie: cookie } },
      env,
    );
    const points = (await res.json()) as ProgressPointDto[];
    expect(points).toHaveLength(2);
    // Ordine crescente per data.
    expect(points[0].topWeight).toBe(60);
    expect(points[1].topWeight).toBe(80);
    // Volume sessione 2 = 70·10 + 80·5 = 1100.
    expect(points[1].volume).toBe(1100);
  });

  it('ignora le serie senza peso o reps', async () => {
    const { userId, cookie } = await seedUserWithSession();
    const db = createDb(env.DB);
    const sessionId = crypto.randomUUID();
    await db.insert(workoutSessions).values({ id: sessionId, userId });
    const seId = crypto.randomUUID();
    await db.insert(sessionExercises).values({
      id: seId,
      workoutSessionId: sessionId,
      exerciseId: 'ex_squat',
      exerciseName: 'Squat',
    });
    // Serie senza peso/reps → nessun dato di progressione.
    await db
      .insert(sessionSets)
      .values({ id: crypto.randomUUID(), sessionExerciseId: seId, setNumber: 1 });

    const rows = (await (
      await app.request('/api/progress/exercises', { headers: { Cookie: cookie } }, env)
    ).json()) as ProgressExerciseDto[];
    expect(rows).toHaveLength(0);
  });

  it('isola i progressi tra utenti', async () => {
    const a = await seedUserWithSession();
    const b = await seedUserWithSession();
    await logSession(a.userId, 'ex_squat', new Date('2026-01-01'), [[100, 5]]);

    const rowsB = (await (
      await app.request('/api/progress/exercises', { headers: { Cookie: b.cookie } }, env)
    ).json()) as ProgressExerciseDto[];
    expect(rowsB).toHaveLength(0);

    const pointsB = (await (
      await app.request('/api/progress/exercises/ex_squat', { headers: { Cookie: b.cookie } }, env)
    ).json()) as ProgressPointDto[];
    expect(pointsB).toHaveLength(0);
  });
});
