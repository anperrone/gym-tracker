import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { roundTo } from '../../../shared/calc';
import type { ProgressExerciseDto, ProgressPointDto } from '../../../shared/schemas';
import type { Db } from '../client';
import { sessionExercises, sessionSets, workoutSessions } from '../schema';

// 1RM stimato (Epley) calcolato in SQL: 30.0 forza la divisione in virgola mobile.
const oneRepMax = sql<number>`${sessionSets.weight} * (1 + ${sessionSets.reps} / 30.0)`;

/** Esercizi con serie loggate (peso+reps), con i migliori valori. Più recenti prima. */
export async function listProgressExercises(
  db: Db,
  userId: string,
): Promise<ProgressExerciseDto[]> {
  // Nome dallo **snapshot** in session_exercises (non dal catalogo): la progressione resta
  // anche se il nome cambia. Serve un exercise_id non nullo come chiave stabile per la serie;
  // le voci di catalogo eliminate (id → NULL) non sono graficabili e restano escluse.
  const rows = await db
    .select({
      exerciseId: sessionExercises.exerciseId,
      exerciseName: sql<string>`max(${sessionExercises.exerciseName})`,
      sessionCount: sql<number>`count(distinct ${workoutSessions.id})`,
      bestWeight: sql<number>`max(${sessionSets.weight})`,
      best1RM: sql<number>`max(${oneRepMax})`,
      lastPerformedAt: sql<number>`max(${workoutSessions.performedAt})`,
    })
    .from(sessionSets)
    .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.id))
    .innerJoin(workoutSessions, eq(sessionExercises.workoutSessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        isNotNull(sessionExercises.exerciseId),
        isNotNull(sessionSets.weight),
        isNotNull(sessionSets.reps),
      ),
    )
    .groupBy(sessionExercises.exerciseId)
    .orderBy(desc(sql`max(${workoutSessions.performedAt})`));

  return rows.flatMap((r) =>
    r.exerciseId === null
      ? []
      : [
          {
            exerciseId: r.exerciseId,
            exerciseName: r.exerciseName,
            sessionCount: r.sessionCount,
            bestWeight: r.bestWeight,
            best1RM: roundTo(r.best1RM, 1),
            lastPerformedAt: new Date(r.lastPerformedAt * 1000).toISOString(),
          },
        ],
  );
}

/** Progressione di un esercizio nel tempo, aggregata per sessione (crescente). */
export async function getExerciseProgress(
  db: Db,
  userId: string,
  exerciseId: string,
): Promise<ProgressPointDto[]> {
  const rows = await db
    .select({
      date: workoutSessions.performedAt,
      topWeight: sql<number>`max(${sessionSets.weight})`,
      volume: sql<number>`sum(${sessionSets.weight} * ${sessionSets.reps})`,
      best1RM: sql<number>`max(${oneRepMax})`,
    })
    .from(sessionSets)
    .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.id))
    .innerJoin(workoutSessions, eq(sessionExercises.workoutSessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(sessionExercises.exerciseId, exerciseId),
        isNotNull(sessionSets.weight),
        isNotNull(sessionSets.reps),
      ),
    )
    .groupBy(workoutSessions.id)
    .orderBy(asc(workoutSessions.performedAt));

  return rows.map((r) => ({
    date: r.date.toISOString(),
    topWeight: r.topWeight,
    volume: r.volume,
    best1RM: roundTo(r.best1RM, 1),
  }));
}
