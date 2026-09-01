import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../src/server';
import { createSession } from '../../src/server/auth/session';
import { createDb } from '../../src/server/db/client';
import { users } from '../../src/server/db/schema';
import type { PlanDetailDto, PlanSummaryDto } from '../../src/shared/schemas';

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

async function createPlan(cookie: string, name = 'Scheda'): Promise<PlanSummaryDto> {
  const res = await req(cookie, '/api/plans', 'POST', { name });
  expect(res.status).toBe(201);
  return (await res.json()) as PlanSummaryDto;
}

describe('API schede', () => {
  it('richiede autenticazione', async () => {
    const res = await app.request('/api/plans', {}, env);
    expect(res.status).toBe(401);
  });

  it('CRUD scheda: crea, lista, aggiorna, elimina', async () => {
    const { cookie } = await seedUserWithSession();

    const plan = await createPlan(cookie, 'Full Body');
    expect(plan.name).toBe('Full Body');
    expect(plan.dayCount).toBe(0);
    expect(plan.isActive).toBe(false);

    const list = (await (await req(cookie, '/api/plans', 'GET')).json()) as PlanSummaryDto[];
    expect(list).toHaveLength(1);

    const patched = (await (
      await req(cookie, `/api/plans/${plan.id}`, 'PATCH', { isActive: true, name: 'FB v2' })
    ).json()) as PlanSummaryDto;
    expect(patched.isActive).toBe(true);
    expect(patched.name).toBe('FB v2');

    const del = await req(cookie, `/api/plans/${plan.id}`, 'DELETE');
    expect(del.status).toBe(200);
    expect((await (await req(cookie, '/api/plans', 'GET')).json()) as unknown[]).toHaveLength(0);
  });

  it('costruisce il dettaglio: giorni + esercizi con target', async () => {
    const { cookie } = await seedUserWithSession();
    const plan = await createPlan(cookie);

    // Aggiungi giorno.
    const withDay = (await (
      await req(cookie, `/api/plans/${plan.id}/days`, 'POST', { name: 'Giorno A' })
    ).json()) as PlanDetailDto;
    expect(withDay.days).toHaveLength(1);
    const dayId = withDay.days[0].id;

    // Aggiungi esercizio dal catalogo con target.
    const withEx = (await (
      await req(cookie, `/api/plans/${plan.id}/days/${dayId}/exercises`, 'POST', {
        exerciseId: 'ex_squat',
        targetSets: 4,
        targetReps: '8-12',
      })
    ).json()) as PlanDetailDto;
    const ex = withEx.days[0].exercises[0];
    expect(ex.exerciseName).toBe('Squat');
    expect(ex.equipment).toBe('barbell');
    expect(ex.targetSets).toBe(4);
    expect(ex.targetReps).toBe('8-12');

    // Aggiorna il target.
    const updated = (await (
      await req(cookie, `/api/plans/${plan.id}/days/${dayId}/exercises/${ex.id}`, 'PATCH', {
        targetSets: 5,
        targetWeight: 80,
      })
    ).json()) as PlanDetailDto;
    expect(updated.days[0].exercises[0].targetSets).toBe(5);
    expect(updated.days[0].exercises[0].targetWeight).toBe(80);

    // Elimina l'esercizio.
    const removed = (await (
      await req(cookie, `/api/plans/${plan.id}/days/${dayId}/exercises/${ex.id}`, 'DELETE')
    ).json()) as PlanDetailDto;
    expect(removed.days[0].exercises).toHaveLength(0);
  });

  it('rifiuta un exerciseId non visibile (400)', async () => {
    const { cookie } = await seedUserWithSession();
    const plan = await createPlan(cookie);
    const withDay = (await (
      await req(cookie, `/api/plans/${plan.id}/days`, 'POST', { name: 'A' })
    ).json()) as PlanDetailDto;
    const res = await req(
      cookie,
      `/api/plans/${plan.id}/days/${withDay.days[0].id}/exercises`,
      'POST',
      { exerciseId: 'ex_inesistente' },
    );
    expect(res.status).toBe(400);
  });

  it('conta i giorni nella lista', async () => {
    const { cookie } = await seedUserWithSession();
    const plan = await createPlan(cookie);
    await req(cookie, `/api/plans/${plan.id}/days`, 'POST', { name: 'A' });
    await req(cookie, `/api/plans/${plan.id}/days`, 'POST', { name: 'B' });
    const list = (await (await req(cookie, '/api/plans', 'GET')).json()) as PlanSummaryDto[];
    expect(list[0].dayCount).toBe(2);
  });

  it("l'attivazione è esclusiva: una sola scheda attiva per utente", async () => {
    const { cookie } = await seedUserWithSession();
    const a = await createPlan(cookie, 'A');
    const b = await createPlan(cookie, 'B');

    await req(cookie, `/api/plans/${a.id}`, 'PATCH', { isActive: true });
    await req(cookie, `/api/plans/${b.id}`, 'PATCH', { isActive: true });

    const list = (await (await req(cookie, '/api/plans', 'GET')).json()) as PlanSummaryDto[];
    const active = list.filter((p) => p.isActive);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(b.id);
  });

  it('isola le schede tra utenti', async () => {
    const a = await seedUserWithSession();
    const b = await seedUserWithSession();
    const plan = await createPlan(a.cookie, 'Solo di A');

    // B non vede la scheda di A.
    const listB = (await (await req(b.cookie, '/api/plans', 'GET')).json()) as PlanSummaryDto[];
    expect(listB).toHaveLength(0);

    // B non accede al dettaglio né la modifica/elimina (404).
    expect((await req(b.cookie, `/api/plans/${plan.id}`, 'GET')).status).toBe(404);
    expect((await req(b.cookie, `/api/plans/${plan.id}`, 'PATCH', { name: 'x' })).status).toBe(404);
    expect((await req(b.cookie, `/api/plans/${plan.id}/days`, 'POST', { name: 'x' })).status).toBe(
      404,
    );
    expect((await req(b.cookie, `/api/plans/${plan.id}`, 'DELETE')).status).toBe(404);

    // A invece sì.
    expect((await req(a.cookie, `/api/plans/${plan.id}`, 'GET')).status).toBe(200);
  });
});
