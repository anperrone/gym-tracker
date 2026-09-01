import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '../../src/server/db/client';
import { sessionExercises, sessionSets, users, workoutSessions } from '../../src/server/db/schema';

async function seedUser(): Promise<string> {
  const db = createDb(env.DB);
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, googleSub: `s-${userId}`, email: `${userId}@example.com` });
  return userId;
}

describe('allenamenti — schema e cascade', () => {
  it('registra serie a peso variabile per esercizio', async () => {
    const db = createDb(env.DB);
    const userId = await seedUser();

    const sessionId = crypto.randomUUID();
    await db.insert(workoutSessions).values({ id: sessionId, userId, clientId: 'c1' });

    const seId = crypto.randomUUID();
    await db
      .insert(sessionExercises)
      .values({ id: seId, workoutSessionId: sessionId, exerciseId: 'ex_squat', sortOrder: 0 });

    // Piramidale: 60×12, 70×10, 80×8.
    await db.insert(sessionSets).values([
      { id: crypto.randomUUID(), sessionExerciseId: seId, setNumber: 1, weight: 60, reps: 12 },
      { id: crypto.randomUUID(), sessionExerciseId: seId, setNumber: 2, weight: 70, reps: 10 },
      { id: crypto.randomUUID(), sessionExerciseId: seId, setNumber: 3, weight: 80, reps: 8 },
    ]);

    const sets = await db.select().from(sessionSets).where(eq(sessionSets.sessionExerciseId, seId));
    expect(sets).toHaveLength(3);
    expect(sets.map((s) => [s.weight, s.reps]).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0))).toEqual([
      [60, 12],
      [70, 10],
      [80, 8],
    ]);
    expect(sets.every((s) => s.completed === false)).toBe(true);
  });

  it('lo stato default è in_progress', async () => {
    const db = createDb(env.DB);
    const userId = await seedUser();
    const id = crypto.randomUUID();
    await db.insert(workoutSessions).values({ id, userId });
    const [row] = await db.select().from(workoutSessions).where(eq(workoutSessions.id, id));
    expect(row.status).toBe('in_progress');
  });

  it('eliminando la sessione si cancellano esercizi e serie a cascata', async () => {
    const db = createDb(env.DB);
    const userId = await seedUser();
    const sessionId = crypto.randomUUID();
    await db.insert(workoutSessions).values({ id: sessionId, userId });
    const seId = crypto.randomUUID();
    await db
      .insert(sessionExercises)
      .values({ id: seId, workoutSessionId: sessionId, exerciseId: 'ex_bench_press' });
    await db
      .insert(sessionSets)
      .values({ id: crypto.randomUUID(), sessionExerciseId: seId, setNumber: 1 });

    await db.delete(workoutSessions).where(eq(workoutSessions.id, sessionId));

    expect(
      await db.select().from(sessionExercises).where(eq(sessionExercises.id, seId)),
    ).toHaveLength(0);
    expect(
      await db.select().from(sessionSets).where(eq(sessionSets.sessionExerciseId, seId)),
    ).toHaveLength(0);
  });
});
