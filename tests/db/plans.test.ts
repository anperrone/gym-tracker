import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '../../src/server/db/client';
import { planDays, planExercises, users, workoutPlans } from '../../src/server/db/schema';

async function seedUser(): Promise<string> {
  const db = createDb(env.DB);
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, googleSub: `s-${userId}`, email: `${userId}@example.com` });
  return userId;
}

describe('schede — schema e cascade', () => {
  it('crea scheda → giorno → esercizio pianificato', async () => {
    const db = createDb(env.DB);
    const userId = await seedUser();

    const planId = crypto.randomUUID();
    await db.insert(workoutPlans).values({ id: planId, userId, name: 'Full Body' });

    const dayId = crypto.randomUUID();
    await db.insert(planDays).values({ id: dayId, planId, name: 'Giorno A', sortOrder: 0 });

    const peId = crypto.randomUUID();
    await db.insert(planExercises).values({
      id: peId,
      planDayId: dayId,
      exerciseId: 'ex_squat',
      sortOrder: 0,
      targetSets: 4,
      targetReps: '8-12',
    });

    const [pe] = await db.select().from(planExercises).where(eq(planExercises.id, peId));
    expect(pe.targetReps).toBe('8-12');
    expect(pe.targetSets).toBe(4);
    expect(pe.targetWeight).toBeNull();
  });

  it('eliminando la scheda si cancellano a cascata giorni ed esercizi', async () => {
    const db = createDb(env.DB);
    const userId = await seedUser();

    const planId = crypto.randomUUID();
    await db.insert(workoutPlans).values({ id: planId, userId, name: 'Push/Pull' });
    const dayId = crypto.randomUUID();
    await db.insert(planDays).values({ id: dayId, planId, name: 'Push' });
    await db.insert(planExercises).values({
      id: crypto.randomUUID(),
      planDayId: dayId,
      exerciseId: 'ex_bench_press',
    });

    await db.delete(workoutPlans).where(eq(workoutPlans.id, planId));

    expect(await db.select().from(planDays).where(eq(planDays.planId, planId))).toHaveLength(0);
    expect(
      await db.select().from(planExercises).where(eq(planExercises.planDayId, dayId)),
    ).toHaveLength(0);
  });
});
