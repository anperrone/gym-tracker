import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../src/server';
import { createSession } from '../../src/server/auth/session';
import { createDb } from '../../src/server/db/client';
import { planDays, planExercises, users, workoutPlans } from '../../src/server/db/schema';
import type { WorkoutSessionDetailDto, WorkoutSessionSummaryDto } from '../../src/shared/schemas';

async function seedUserWithSession(): Promise<{ userId: string; cookie: string }> {
  const db = createDb(env.DB);
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, googleSub: `s-${userId}`, email: `${userId}@example.com` });
  const token = await createSession(db, userId);
  return { userId, cookie: `session=${token}` };
}

function req(cookie: string, path: string, method: string, body?: unknown) {
  return app.request(
    path,
    {
      method,
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    env,
  );
}

async function start(cookie: string, body: Record<string, unknown>) {
  return req(cookie, '/api/sessions', 'POST', body);
}

describe('API allenamenti', () => {
  it('richiede autenticazione', async () => {
    const res = await app.request('/api/sessions', {}, env);
    expect(res.status).toBe(401);
  });

  it('avvia una sessione libera (in_progress)', async () => {
    const { cookie } = await seedUserWithSession();
    const res = await start(cookie, { clientId: crypto.randomUUID() });
    expect(res.status).toBe(201);
    const detail = (await res.json()) as WorkoutSessionDetailDto;
    expect(detail.status).toBe('in_progress');
    expect(detail.planDayId).toBeNull();
    expect(detail.exercises).toHaveLength(0);
  });

  it('è idempotente per clientId (replay non duplica)', async () => {
    const { cookie } = await seedUserWithSession();
    const clientId = crypto.randomUUID();
    const first = await start(cookie, { clientId });
    expect(first.status).toBe(201);
    const firstDetail = (await first.json()) as WorkoutSessionDetailDto;

    const replay = await start(cookie, { clientId });
    expect(replay.status).toBe(200); // già esistente
    const replayDetail = (await replay.json()) as WorkoutSessionDetailDto;
    expect(replayDetail.id).toBe(firstDetail.id);

    const list = (await (await req(cookie, '/api/sessions', 'GET')).json()) as unknown[];
    expect(list).toHaveLength(1);
  });

  it('registra serie a peso variabile (60×12, 70×10, 80×8) e le completa', async () => {
    const { cookie } = await seedUserWithSession();
    const started = (await (
      await start(cookie, { clientId: crypto.randomUUID() })
    ).json()) as WorkoutSessionDetailDto;

    const withEx = (await (
      await req(cookie, `/api/sessions/${started.id}/exercises`, 'POST', { exerciseId: 'ex_squat' })
    ).json()) as WorkoutSessionDetailDto;
    const seId = withEx.exercises[0].id;

    for (const [weight, reps] of [
      [60, 12],
      [70, 10],
      [80, 8],
    ]) {
      const res = await req(cookie, `/api/sessions/${started.id}/exercises/${seId}/sets`, 'POST', {
        weight,
        reps,
        completed: true,
      });
      expect(res.status).toBe(201);
    }

    const detail = (await (
      await req(cookie, `/api/sessions/${started.id}`, 'GET')
    ).json()) as WorkoutSessionDetailDto;
    const sets = detail.exercises[0].sets;
    expect(sets).toHaveLength(3);
    expect(sets.map((s) => [s.weight, s.reps])).toEqual([
      [60, 12],
      [70, 10],
      [80, 8],
    ]);
    expect(sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
    expect(sets.every((s) => s.completed)).toBe(true);
  });

  it('completa la sessione (status completed)', async () => {
    const { cookie } = await seedUserWithSession();
    const started = (await (
      await start(cookie, { clientId: crypto.randomUUID() })
    ).json()) as WorkoutSessionDetailDto;
    const done = (await (
      await req(cookie, `/api/sessions/${started.id}`, 'PATCH', {
        status: 'completed',
        durationSeconds: 3600,
      })
    ).json()) as WorkoutSessionDetailDto;
    expect(done.status).toBe('completed');
    expect(done.durationSeconds).toBe(3600);
  });

  it('pre-popola gli esercizi da un giorno di scheda', async () => {
    const { userId, cookie } = await seedUserWithSession();
    const db = createDb(env.DB);
    const planId = crypto.randomUUID();
    await db.insert(workoutPlans).values({ id: planId, userId, name: 'P' });
    const dayId = crypto.randomUUID();
    await db.insert(planDays).values({ id: dayId, planId, name: 'A' });
    await db.insert(planExercises).values([
      {
        id: crypto.randomUUID(),
        planDayId: dayId,
        exerciseId: 'ex_squat',
        sortOrder: 0,
        targetSets: 3,
        targetWeight: 60,
      },
      { id: crypto.randomUUID(), planDayId: dayId, exerciseId: 'ex_bench_press', sortOrder: 1 },
    ]);

    const detail = (await (
      await start(cookie, { clientId: crypto.randomUUID(), planDayId: dayId })
    ).json()) as WorkoutSessionDetailDto;
    expect(detail.planDayId).toBe(dayId);
    expect(detail.exercises).toHaveLength(2);
    expect(detail.exercises[0].exerciseName).toBe('Squat');
    // 3 serie pre-create con peso dal target.
    expect(detail.exercises[0].sets).toHaveLength(3);
    expect(detail.exercises[0].sets[0].weight).toBe(60);
    // Esercizio senza target_sets → nessuna serie pre-creata.
    expect(detail.exercises[1].sets).toHaveLength(0);
  });

  it('rifiuta un exerciseId non visibile (400)', async () => {
    const { cookie } = await seedUserWithSession();
    const started = (await (
      await start(cookie, { clientId: crypto.randomUUID() })
    ).json()) as WorkoutSessionDetailDto;
    const res = await req(cookie, `/api/sessions/${started.id}/exercises`, 'POST', {
      exerciseId: 'ex_inesistente',
    });
    expect(res.status).toBe(400);
  });

  it('isola le sessioni tra utenti', async () => {
    const a = await seedUserWithSession();
    const b = await seedUserWithSession();
    const started = (await (
      await start(a.cookie, { clientId: crypto.randomUUID() })
    ).json()) as WorkoutSessionDetailDto;

    // B non vede la sessione di A.
    const listB = (await (
      await req(b.cookie, '/api/sessions', 'GET')
    ).json()) as WorkoutSessionSummaryDto[];
    expect(listB).toHaveLength(0);

    // B non accede al dettaglio né aggiunge esercizi/elimina.
    expect((await req(b.cookie, `/api/sessions/${started.id}`, 'GET')).status).toBe(404);
    expect(
      (
        await req(b.cookie, `/api/sessions/${started.id}/exercises`, 'POST', {
          exerciseId: 'ex_squat',
        })
      ).status,
    ).toBe(404);
    expect((await req(b.cookie, `/api/sessions/${started.id}`, 'DELETE')).status).toBe(404);

    // A invece accede alla propria sessione.
    expect((await req(a.cookie, `/api/sessions/${started.id}`, 'GET')).status).toBe(200);
  });

  it('lista e conta esercizi/serie', async () => {
    const { cookie } = await seedUserWithSession();
    const started = (await (
      await start(cookie, { clientId: crypto.randomUUID() })
    ).json()) as WorkoutSessionDetailDto;
    const withEx = (await (
      await req(cookie, `/api/sessions/${started.id}/exercises`, 'POST', { exerciseId: 'ex_squat' })
    ).json()) as WorkoutSessionDetailDto;
    await req(
      cookie,
      `/api/sessions/${started.id}/exercises/${withEx.exercises[0].id}/sets`,
      'POST',
      {
        weight: 60,
        reps: 10,
      },
    );

    const list = (await (
      await req(cookie, '/api/sessions', 'GET')
    ).json()) as WorkoutSessionSummaryDto[];
    expect(list).toHaveLength(1);
    expect(list[0].exerciseCount).toBe(1);
    expect(list[0].setCount).toBe(1);
  });
});
