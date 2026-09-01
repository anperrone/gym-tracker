import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type {
  AddSessionExerciseInput,
  CreateSetInput,
  SessionExerciseDto,
  StartSessionInput,
  UpdateSessionInput,
  UpdateSetInput,
  WorkoutSessionDetailDto,
  WorkoutSessionSummaryDto,
} from '../../../shared/schemas';
import type { Db } from '../client';
import {
  exercises,
  planDays,
  planExercises,
  sessionExercises,
  sessionSets,
  workoutPlans,
  workoutSessions,
} from '../schema';

type SessionRow = typeof workoutSessions.$inferSelect;

/** Sessione posseduta dall'utente (o undefined). */
async function ownedSession(db: Db, userId: string, id: string): Promise<SessionRow | undefined> {
  const [row] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)));
  return row;
}

/** Segna la sessione come modificata (updated_at). */
async function touchSession(db: Db, id: string): Promise<void> {
  await db.update(workoutSessions).set({ updatedAt: new Date() }).where(eq(workoutSessions.id, id));
}

/** Dettaglio completo (esercizi + serie, con nome/attrezzatura). Null se non di proprietà. */
export async function getSessionDetail(
  db: Db,
  userId: string,
  id: string,
): Promise<WorkoutSessionDetailDto | null> {
  const session = await ownedSession(db, userId, id);
  if (!session) return null;

  // Nome/attrezzatura dallo snapshot in session_exercises (la storia sopravvive all'eliminazione dal catalogo).
  const exRows = await db
    .select({
      id: sessionExercises.id,
      exerciseId: sessionExercises.exerciseId,
      exerciseName: sessionExercises.exerciseName,
      equipment: sessionExercises.equipment,
      sortOrder: sessionExercises.sortOrder,
    })
    .from(sessionExercises)
    .where(eq(sessionExercises.workoutSessionId, id))
    .orderBy(asc(sessionExercises.sortOrder));

  const exIds = exRows.map((e) => e.id);
  const setRows = exIds.length
    ? await db
        .select()
        .from(sessionSets)
        .where(inArray(sessionSets.sessionExerciseId, exIds))
        .orderBy(asc(sessionSets.setNumber))
    : [];

  const setsByExercise = new Map<string, WorkoutSessionDetailDto['exercises'][number]['sets']>();
  for (const s of setRows) {
    const arr = setsByExercise.get(s.sessionExerciseId) ?? [];
    arr.push({
      id: s.id,
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      notes: s.notes,
      completed: s.completed,
    });
    setsByExercise.set(s.sessionExerciseId, arr);
  }

  const exercisesDto: SessionExerciseDto[] = exRows.map((e) => ({
    id: e.id,
    exerciseId: e.exerciseId,
    exerciseName: e.exerciseName,
    equipment: e.equipment,
    sortOrder: e.sortOrder,
    sets: setsByExercise.get(e.id) ?? [],
  }));

  return {
    id: session.id,
    planDayId: session.planDayId,
    status: session.status,
    performedAt: session.performedAt.toISOString(),
    durationSeconds: session.durationSeconds,
    notes: session.notes,
    exercises: exercisesDto,
  };
}

/** Elenco sessioni dell'utente (più recenti prima) con conteggi esercizi/serie. */
export async function listSessions(db: Db, userId: string): Promise<WorkoutSessionSummaryDto[]> {
  const sessions = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId))
    .orderBy(desc(workoutSessions.performedAt));
  if (sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const exRows = await db
    .select({ sessionId: sessionExercises.workoutSessionId, id: sessionExercises.id })
    .from(sessionExercises)
    .where(inArray(sessionExercises.workoutSessionId, ids));

  const exCount = new Map<string, number>();
  const exToSession = new Map<string, string>();
  for (const e of exRows) {
    exCount.set(e.sessionId, (exCount.get(e.sessionId) ?? 0) + 1);
    exToSession.set(e.id, e.sessionId);
  }

  const setCount = new Map<string, number>();
  if (exRows.length > 0) {
    const setRows = await db
      .select({ sessionExerciseId: sessionSets.sessionExerciseId })
      .from(sessionSets)
      .where(
        inArray(
          sessionSets.sessionExerciseId,
          exRows.map((e) => e.id),
        ),
      );
    for (const s of setRows) {
      const sessionId = exToSession.get(s.sessionExerciseId);
      if (sessionId) setCount.set(sessionId, (setCount.get(sessionId) ?? 0) + 1);
    }
  }

  return sessions.map((s) => ({
    id: s.id,
    status: s.status,
    performedAt: s.performedAt.toISOString(),
    planDayId: s.planDayId,
    exerciseCount: exCount.get(s.id) ?? 0,
    setCount: setCount.get(s.id) ?? 0,
  }));
}

/** True se il giorno di scheda appartiene all'utente. */
async function dayIsOwned(db: Db, userId: string, planDayId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: planDays.id })
    .from(planDays)
    .innerJoin(workoutPlans, eq(planDays.planId, workoutPlans.id))
    .where(and(eq(planDays.id, planDayId), eq(workoutPlans.userId, userId)));
  return row !== undefined;
}

/** Esercizi pianificati di un giorno di scheda (con nome/attrezzatura per lo snapshot). */
async function ownedPlanDayExercises(db: Db, userId: string, planDayId: string) {
  return db
    .select({
      exerciseId: planExercises.exerciseId,
      exerciseName: exercises.name,
      equipment: exercises.equipment,
      targetSets: planExercises.targetSets,
      targetWeight: planExercises.targetWeight,
    })
    .from(planExercises)
    .innerJoin(planDays, eq(planExercises.planDayId, planDays.id))
    .innerJoin(workoutPlans, eq(planDays.planId, workoutPlans.id))
    .innerJoin(exercises, eq(planExercises.exerciseId, exercises.id))
    .where(and(eq(planDays.id, planDayId), eq(workoutPlans.userId, userId)))
    .orderBy(asc(planExercises.sortOrder));
}

/** Id della sessione con quel clientId per l'utente (per l'idempotenza). */
async function findSessionByClientId(
  db: Db,
  userId: string,
  clientId: string,
): Promise<string | undefined> {
  const [row] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.clientId, clientId)));
  return row?.id;
}

export type StartSessionResult = { created: boolean; detail: WorkoutSessionDetailDto };

/**
 * Avvia una sessione. Idempotente per (userId, clientId): un replay restituisce la stessa
 * sessione senza duplicarla. Con planDayId di proprietà pre-popola esercizi (+ serie dai target).
 */
/** Se esiste già una sessione con quel clientId, restituisce il risultato idempotente. */
async function existingSessionResult(
  db: Db,
  userId: string,
  clientId: string,
): Promise<StartSessionResult | null> {
  const id = await findSessionByClientId(db, userId, clientId);
  if (!id) return null;
  const detail = await getSessionDetail(db, userId, id);
  return detail ? { created: false, detail } : null;
}

export async function startSession(
  db: Db,
  userId: string,
  input: StartSessionInput,
): Promise<StartSessionResult> {
  // Fast-path idempotenza: replay dello stesso clientId → stessa sessione.
  const existing = await existingSessionResult(db, userId, input.clientId);
  if (existing) return existing;

  // Associa il giorno di scheda solo se di proprietà (anche se ha 0 esercizi).
  const owned = input.planDayId ? await dayIsOwned(db, userId, input.planDayId) : false;
  const planDayId = owned && input.planDayId ? input.planDayId : null;

  const sessionId = crypto.randomUUID();
  try {
    await db.insert(workoutSessions).values({
      id: sessionId,
      userId,
      planDayId,
      clientId: input.clientId,
      notes: input.notes ?? null,
      ...(input.performedAt ? { performedAt: new Date(input.performedAt) } : {}),
    });
  } catch (err) {
    // Corsa: un replay concorrente ha già creato la sessione (unique su user+client_id).
    const raced = await existingSessionResult(db, userId, input.clientId);
    if (raced) return raced;
    throw err;
  }

  if (planDayId) await prepopulateFromPlanDay(db, userId, sessionId, planDayId);

  const detail = await getSessionDetail(db, userId, sessionId);
  if (!detail) throw new Error('sessione creata ma non recuperabile');
  return { created: true, detail };
}

/** Copia gli esercizi del giorno di scheda nella sessione (snapshot), atomicamente. */
async function prepopulateFromPlanDay(
  db: Db,
  userId: string,
  sessionId: string,
  planDayId: string,
): Promise<void> {
  const planExs = await ownedPlanDayExercises(db, userId, planDayId);
  const exRows = planExs.map((pe, i) => ({ seId: crypto.randomUUID(), pe, sortOrder: i }));
  if (exRows.length === 0) return;

  const setRows = exRows.flatMap(({ seId, pe }) =>
    Array.from({ length: pe.targetSets ?? 0 }, (_, n) => ({
      id: crypto.randomUUID(),
      sessionExerciseId: seId,
      setNumber: n + 1,
      weight: pe.targetWeight ?? null,
    })),
  );
  const statements: BatchItem<'sqlite'>[] = [
    db.insert(sessionExercises).values(
      exRows.map(({ seId, pe, sortOrder }) => ({
        id: seId,
        workoutSessionId: sessionId,
        exerciseId: pe.exerciseId,
        exerciseName: pe.exerciseName,
        equipment: pe.equipment,
        sortOrder,
      })),
    ),
  ];
  if (setRows.length > 0) statements.push(db.insert(sessionSets).values(setRows));
  await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
}

export async function updateSession(
  db: Db,
  userId: string,
  id: string,
  input: UpdateSessionInput,
): Promise<WorkoutSessionDetailDto | null> {
  if (!(await ownedSession(db, userId, id))) return null;

  const patch: Partial<typeof workoutSessions.$inferInsert> = { updatedAt: new Date() };
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.durationSeconds !== undefined) patch.durationSeconds = input.durationSeconds;
  if (input.performedAt !== undefined) patch.performedAt = new Date(input.performedAt);

  await db.update(workoutSessions).set(patch).where(eq(workoutSessions.id, id));
  return getSessionDetail(db, userId, id);
}

export async function deleteSession(db: Db, userId: string, id: string): Promise<boolean> {
  if (!(await ownedSession(db, userId, id))) return false;
  await db.delete(workoutSessions).where(eq(workoutSessions.id, id));
  return true;
}

// --- Esercizi & serie della sessione (le mutation restituiscono il dettaglio aggiornato) ---

/** Esercizio visibile all'utente (globale o custom proprio) con nome/attrezzatura, o undefined. */
async function getVisibleExercise(db: Db, userId: string, exerciseId: string) {
  const [row] = await db
    .select({ name: exercises.name, equipment: exercises.equipment })
    .from(exercises)
    .where(
      and(eq(exercises.id, exerciseId), or(isNull(exercises.userId), eq(exercises.userId, userId))),
    );
  return row;
}

export type AddSessionExerciseResult =
  | { ok: true; detail: WorkoutSessionDetailDto }
  | { ok: false; error: 'not_found' | 'invalid_exercise' };

export async function addSessionExercise(
  db: Db,
  userId: string,
  sessionId: string,
  input: AddSessionExerciseInput,
): Promise<AddSessionExerciseResult> {
  if (!(await ownedSession(db, userId, sessionId))) return { ok: false, error: 'not_found' };
  const ex = await getVisibleExercise(db, userId, input.exerciseId);
  if (!ex) return { ok: false, error: 'invalid_exercise' };

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${sessionExercises.sortOrder}), -1)` })
    .from(sessionExercises)
    .where(eq(sessionExercises.workoutSessionId, sessionId));

  await db.insert(sessionExercises).values({
    id: crypto.randomUUID(),
    workoutSessionId: sessionId,
    exerciseId: input.exerciseId,
    exerciseName: ex.name,
    equipment: ex.equipment,
    sortOrder: max + 1,
  });
  await touchSession(db, sessionId);

  const detail = await getSessionDetail(db, userId, sessionId);
  return detail ? { ok: true, detail } : { ok: false, error: 'not_found' };
}

/** True se l'esercizio-sessione appartiene a una sessione posseduta dall'utente. */
async function exerciseInOwnedSession(
  db: Db,
  userId: string,
  sessionId: string,
  seId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: sessionExercises.id })
    .from(sessionExercises)
    .innerJoin(workoutSessions, eq(sessionExercises.workoutSessionId, workoutSessions.id))
    .where(
      and(
        eq(sessionExercises.id, seId),
        eq(sessionExercises.workoutSessionId, sessionId),
        eq(workoutSessions.userId, userId),
      ),
    );
  return row !== undefined;
}

export async function deleteSessionExercise(
  db: Db,
  userId: string,
  sessionId: string,
  seId: string,
): Promise<WorkoutSessionDetailDto | null> {
  if (!(await exerciseInOwnedSession(db, userId, sessionId, seId))) return null;
  await db.delete(sessionExercises).where(eq(sessionExercises.id, seId));
  await touchSession(db, sessionId);
  return getSessionDetail(db, userId, sessionId);
}

export async function addSet(
  db: Db,
  userId: string,
  sessionId: string,
  seId: string,
  input: CreateSetInput,
): Promise<WorkoutSessionDetailDto | null> {
  if (!(await exerciseInOwnedSession(db, userId, sessionId, seId))) return null;

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${sessionSets.setNumber}), 0)` })
    .from(sessionSets)
    .where(eq(sessionSets.sessionExerciseId, seId));

  await db.insert(sessionSets).values({
    id: crypto.randomUUID(),
    sessionExerciseId: seId,
    setNumber: max + 1,
    weight: input.weight ?? null,
    reps: input.reps ?? null,
    notes: input.notes ?? null,
    completed: input.completed ?? false,
  });
  await touchSession(db, sessionId);
  return getSessionDetail(db, userId, sessionId);
}

/** True se la serie appartiene all'esercizio/sessione posseduti dall'utente. */
async function setInOwnedSession(
  db: Db,
  userId: string,
  sessionId: string,
  seId: string,
  setId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: sessionSets.id })
    .from(sessionSets)
    .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.id))
    .innerJoin(workoutSessions, eq(sessionExercises.workoutSessionId, workoutSessions.id))
    .where(
      and(
        eq(sessionSets.id, setId),
        eq(sessionSets.sessionExerciseId, seId),
        eq(sessionExercises.workoutSessionId, sessionId),
        eq(workoutSessions.userId, userId),
      ),
    );
  return row !== undefined;
}

export async function updateSet(
  db: Db,
  userId: string,
  sessionId: string,
  seId: string,
  setId: string,
  input: UpdateSetInput,
): Promise<WorkoutSessionDetailDto | null> {
  if (!(await setInOwnedSession(db, userId, sessionId, seId, setId))) return null;

  const patch: Partial<typeof sessionSets.$inferInsert> = {};
  if (input.weight !== undefined) patch.weight = input.weight;
  if (input.reps !== undefined) patch.reps = input.reps;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.completed !== undefined) patch.completed = input.completed;
  if (Object.keys(patch).length > 0) {
    await db.update(sessionSets).set(patch).where(eq(sessionSets.id, setId));
    await touchSession(db, sessionId);
  }
  return getSessionDetail(db, userId, sessionId);
}

export async function deleteSet(
  db: Db,
  userId: string,
  sessionId: string,
  seId: string,
  setId: string,
): Promise<WorkoutSessionDetailDto | null> {
  if (!(await setInOwnedSession(db, userId, sessionId, seId, setId))) return null;
  await db.delete(sessionSets).where(eq(sessionSets.id, setId));
  await touchSession(db, sessionId);
  return getSessionDetail(db, userId, sessionId);
}
