import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../src/server';
import { createSession } from '../../src/server/auth/session';
import { chunkedInserts } from '../../src/server/db/batch';
import { createDb } from '../../src/server/db/client';
import {
  measurementEntries,
  measurementValues,
  planDays,
  sessionExercises,
  sessionSets,
  users,
  workoutPlans,
  workoutSessions,
} from '../../src/server/db/schema';
import type {
  MeasurementEntryDto,
  PlanSummaryDto,
  WorkoutSessionSummaryDto,
} from '../../src/shared/schemas';

// D1 accetta al massimo 100 parametri per query: gli elenchi non devono passare al DB
// tutti gli id dell'utente (es. `IN (...)`), altrimenti si rompono oltre una certa storia.
const MANY = 120;

async function seedUser() {
  const db = createDb(env.DB);
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, googleSub: `s-${userId}`, email: `${userId}@example.com` });
  return { db, userId, cookie: `session=${await createSession(db, userId)}` };
}

async function get<T>(cookie: string, path: string): Promise<{ status: number; body: T }> {
  const res = await app.request(path, { headers: { Cookie: cookie } }, env);
  return { status: res.status, body: (await res.json()) as T };
}

function ids(n: number) {
  return Array.from({ length: n }, () => crypto.randomUUID());
}

describe('elenchi con storia lunga (limite parametri D1)', () => {
  it(`GET /api/sessions con ${MANY} esercizi nello storico`, async () => {
    const { db, userId, cookie } = await seedUser();
    const sessionIds = ids(MANY / 4);
    const exRows = sessionIds.flatMap((sid) =>
      ids(4).map((id, i) => ({
        id,
        workoutSessionId: sid,
        exerciseName: 'Panca piana',
        sortOrder: i,
      })),
    );
    await db.batch([
      db.insert(workoutSessions).values(sessionIds.map((id) => ({ id, userId }))),
      ...chunkedInserts(db, sessionExercises, exRows),
      ...chunkedInserts(
        db,
        sessionSets,
        exRows.flatMap((ex) =>
          [1, 2].map((setNumber) => ({
            id: crypto.randomUUID(),
            sessionExerciseId: ex.id,
            setNumber,
          })),
        ),
      ),
    ]);

    const { status, body } = await get<WorkoutSessionSummaryDto[]>(cookie, '/api/sessions');
    expect(status).toBe(200);
    expect(body).toHaveLength(MANY / 4);
    expect(body.every((s) => s.exerciseCount === 4 && s.setCount === 8)).toBe(true);
  });

  it(`GET /api/measurements con ${MANY} misurazioni`, async () => {
    const { db, userId, cookie } = await seedUser();
    const entryIds = ids(MANY);
    await db.batch([
      ...chunkedInserts(
        db,
        measurementEntries,
        entryIds.map((id, i) => ({
          id,
          userId,
          measuredAt: new Date(Date.UTC(2026, 0, 1) + i * 864e5),
        })),
      ),
      ...chunkedInserts(
        db,
        measurementValues,
        entryIds.map((entryId) => ({
          id: crypto.randomUUID(),
          entryId,
          typeId: 'mt_arm',
          value: 35,
        })),
      ),
    ]);

    const { status, body } = await get<MeasurementEntryDto[]>(cookie, '/api/measurements');
    expect(status).toBe(200);
    expect(body).toHaveLength(MANY);
    expect(body.every((e) => e.values.length === 1)).toBe(true);
  });

  it(`GET /api/plans con ${MANY} schede`, async () => {
    const { db, userId, cookie } = await seedUser();
    const planIds = ids(MANY);
    await db.batch([
      ...chunkedInserts(
        db,
        workoutPlans,
        planIds.map((id) => ({ id, userId, name: 'P' })),
      ),
      ...chunkedInserts(
        db,
        planDays,
        planIds.map((planId) => ({ id: crypto.randomUUID(), planId, name: 'A' })),
      ),
    ]);

    const { status, body } = await get<PlanSummaryDto[]>(cookie, '/api/plans');
    expect(status).toBe(200);
    expect(body).toHaveLength(MANY);
    expect(body.every((p) => p.dayCount === 1)).toBe(true);
  });
});
