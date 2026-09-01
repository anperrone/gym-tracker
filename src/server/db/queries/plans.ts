import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type {
  CreatePlanDayInput,
  CreatePlanExerciseInput,
  CreatePlanInput,
  PlanDetailDto,
  PlanExerciseDto,
  PlanSummaryDto,
  UpdatePlanDayInput,
  UpdatePlanExerciseInput,
  UpdatePlanInput,
} from '../../../shared/schemas';
import type { Db } from '../client';
import { exercises, planDays, planExercises, workoutPlans } from '../schema';

type PlanRow = typeof workoutPlans.$inferSelect;

function toSummary(row: PlanRow, dayCount: number): PlanSummaryDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    dayCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Elenco schede dell'utente (più recenti prima) con conteggio giorni. */
export async function listPlans(db: Db, userId: string): Promise<PlanSummaryDto[]> {
  const plans = await db
    .select()
    .from(workoutPlans)
    .where(eq(workoutPlans.userId, userId))
    .orderBy(desc(workoutPlans.updatedAt));
  if (plans.length === 0) return [];

  const dayRows = await db
    .select({ planId: planDays.planId })
    .from(planDays)
    .where(
      inArray(
        planDays.planId,
        plans.map((p) => p.id),
      ),
    );
  const counts = new Map<string, number>();
  for (const d of dayRows) counts.set(d.planId, (counts.get(d.planId) ?? 0) + 1);

  return plans.map((p) => toSummary(p, counts.get(p.id) ?? 0));
}

export async function createPlan(
  db: Db,
  userId: string,
  input: CreatePlanInput,
): Promise<PlanSummaryDto> {
  const [row] = await db
    .insert(workoutPlans)
    .values({
      id: crypto.randomUUID(),
      userId,
      name: input.name,
      description: input.description ?? null,
    })
    .returning();
  return toSummary(row, 0);
}

/** Scheda posseduta dall'utente (o undefined). */
async function ownedPlan(db: Db, userId: string, planId: string): Promise<PlanRow | undefined> {
  const [row] = await db
    .select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.id, planId), eq(workoutPlans.userId, userId)));
  return row;
}

/** Dettaglio completo (giorni + esercizi con nome/attrezzatura). Null se non di proprietà. */
export async function getPlanDetail(
  db: Db,
  userId: string,
  planId: string,
): Promise<PlanDetailDto | null> {
  const plan = await ownedPlan(db, userId, planId);
  if (!plan) return null;

  const days = await db
    .select()
    .from(planDays)
    .where(eq(planDays.planId, planId))
    .orderBy(asc(planDays.sortOrder), asc(planDays.name));

  const dayIds = days.map((d) => d.id);
  const peRows = dayIds.length
    ? await db
        .select({
          id: planExercises.id,
          planDayId: planExercises.planDayId,
          exerciseId: planExercises.exerciseId,
          exerciseName: exercises.name,
          equipment: exercises.equipment,
          sortOrder: planExercises.sortOrder,
          targetSets: planExercises.targetSets,
          targetReps: planExercises.targetReps,
          targetWeight: planExercises.targetWeight,
          restSeconds: planExercises.restSeconds,
          notes: planExercises.notes,
        })
        .from(planExercises)
        .innerJoin(exercises, eq(planExercises.exerciseId, exercises.id))
        .where(inArray(planExercises.planDayId, dayIds))
        .orderBy(asc(planExercises.sortOrder))
    : [];

  const byDay = new Map<string, PlanExerciseDto[]>();
  for (const pe of peRows) {
    const arr = byDay.get(pe.planDayId) ?? [];
    arr.push({
      id: pe.id,
      exerciseId: pe.exerciseId,
      exerciseName: pe.exerciseName,
      equipment: pe.equipment,
      sortOrder: pe.sortOrder,
      targetSets: pe.targetSets,
      targetReps: pe.targetReps,
      targetWeight: pe.targetWeight,
      restSeconds: pe.restSeconds,
      notes: pe.notes,
    });
    byDay.set(pe.planDayId, arr);
  }

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    isActive: plan.isActive,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    days: days.map((d) => ({
      id: d.id,
      name: d.name,
      sortOrder: d.sortOrder,
      exercises: byDay.get(d.id) ?? [],
    })),
  };
}

export async function updatePlan(
  db: Db,
  userId: string,
  planId: string,
  input: UpdatePlanInput,
): Promise<PlanSummaryDto | null> {
  if (!(await ownedPlan(db, userId, planId))) return null;

  const patch: Partial<typeof workoutPlans.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  const [row] = await db
    .update(workoutPlans)
    .set(patch)
    .where(eq(workoutPlans.id, planId))
    .returning();
  if (!row) return null;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(planDays)
    .where(eq(planDays.planId, planId));
  return toSummary(row, count);
}

export async function deletePlan(db: Db, userId: string, planId: string): Promise<boolean> {
  if (!(await ownedPlan(db, userId, planId))) return false;
  await db.delete(workoutPlans).where(eq(workoutPlans.id, planId));
  return true;
}

// --- Giorni & esercizi pianificati (le mutation restituiscono il dettaglio aggiornato) ---

/** Segna la scheda come modificata (updated_at) — chiamare dopo ogni mutation annidata. */
async function touchPlan(db: Db, planId: string): Promise<void> {
  await db.update(workoutPlans).set({ updatedAt: new Date() }).where(eq(workoutPlans.id, planId));
}

/** Prossimo sort_order (append in coda) tra i giorni di una scheda. */
async function nextDaySort(db: Db, planId: string): Promise<number> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${planDays.sortOrder}), -1)` })
    .from(planDays)
    .where(eq(planDays.planId, planId));
  return max + 1;
}

/** Prossimo sort_order (append in coda) tra gli esercizi di un giorno. */
async function nextExerciseSort(db: Db, dayId: string): Promise<number> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${planExercises.sortOrder}), -1)` })
    .from(planExercises)
    .where(eq(planExercises.planDayId, dayId));
  return max + 1;
}

export async function addPlanDay(
  db: Db,
  userId: string,
  planId: string,
  input: CreatePlanDayInput,
): Promise<PlanDetailDto | null> {
  if (!(await ownedPlan(db, userId, planId))) return null;
  const sortOrder = await nextDaySort(db, planId);
  await db
    .insert(planDays)
    .values({ id: crypto.randomUUID(), planId, name: input.name, sortOrder });
  await touchPlan(db, planId);
  return getPlanDetail(db, userId, planId);
}

/** True se il giorno appartiene a una scheda posseduta dall'utente. */
async function dayInOwnedPlan(
  db: Db,
  userId: string,
  planId: string,
  dayId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: planDays.id })
    .from(planDays)
    .innerJoin(workoutPlans, eq(planDays.planId, workoutPlans.id))
    .where(
      and(eq(planDays.id, dayId), eq(planDays.planId, planId), eq(workoutPlans.userId, userId)),
    );
  return row !== undefined;
}

export async function updatePlanDay(
  db: Db,
  userId: string,
  planId: string,
  dayId: string,
  input: UpdatePlanDayInput,
): Promise<PlanDetailDto | null> {
  if (!(await dayInOwnedPlan(db, userId, planId, dayId))) return null;
  const patch: Partial<typeof planDays.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (Object.keys(patch).length > 0) {
    await db.update(planDays).set(patch).where(eq(planDays.id, dayId));
    await touchPlan(db, planId);
  }
  return getPlanDetail(db, userId, planId);
}

export async function deletePlanDay(
  db: Db,
  userId: string,
  planId: string,
  dayId: string,
): Promise<PlanDetailDto | null> {
  if (!(await dayInOwnedPlan(db, userId, planId, dayId))) return null;
  await db.delete(planDays).where(eq(planDays.id, dayId));
  await touchPlan(db, planId);
  return getPlanDetail(db, userId, planId);
}

/** True se l'esercizio è visibile all'utente (catalogo globale o suo custom). */
async function isExerciseVisible(db: Db, userId: string, exerciseId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      and(eq(exercises.id, exerciseId), or(isNull(exercises.userId), eq(exercises.userId, userId))),
    );
  return row !== undefined;
}

export type AddPlanExerciseResult =
  | { ok: true; detail: PlanDetailDto }
  | { ok: false; error: 'not_found' | 'invalid_exercise' };

export async function addPlanExercise(
  db: Db,
  userId: string,
  planId: string,
  dayId: string,
  input: CreatePlanExerciseInput,
): Promise<AddPlanExerciseResult> {
  if (!(await dayInOwnedPlan(db, userId, planId, dayId))) return { ok: false, error: 'not_found' };
  if (!(await isExerciseVisible(db, userId, input.exerciseId))) {
    return { ok: false, error: 'invalid_exercise' };
  }

  const sortOrder = await nextExerciseSort(db, dayId);
  await db.insert(planExercises).values({
    id: crypto.randomUUID(),
    planDayId: dayId,
    exerciseId: input.exerciseId,
    sortOrder,
    targetSets: input.targetSets ?? null,
    targetReps: input.targetReps ?? null,
    targetWeight: input.targetWeight ?? null,
    restSeconds: input.restSeconds ?? null,
    notes: input.notes ?? null,
  });
  await touchPlan(db, planId);

  const detail = await getPlanDetail(db, userId, planId);
  // La scheda esiste per forza (dayInOwnedPlan sopra), ma restringiamo il tipo.
  return detail ? { ok: true, detail } : { ok: false, error: 'not_found' };
}

/** True se l'esercizio pianificato appartiene al giorno/scheda posseduti dall'utente. */
async function planExerciseInOwnedPlan(
  db: Db,
  userId: string,
  planId: string,
  dayId: string,
  peId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: planExercises.id })
    .from(planExercises)
    .innerJoin(planDays, eq(planExercises.planDayId, planDays.id))
    .innerJoin(workoutPlans, eq(planDays.planId, workoutPlans.id))
    .where(
      and(
        eq(planExercises.id, peId),
        eq(planExercises.planDayId, dayId),
        eq(planDays.planId, planId),
        eq(workoutPlans.userId, userId),
      ),
    );
  return row !== undefined;
}

export async function updatePlanExercise(
  db: Db,
  userId: string,
  planId: string,
  dayId: string,
  peId: string,
  input: UpdatePlanExerciseInput,
): Promise<PlanDetailDto | null> {
  if (!(await planExerciseInOwnedPlan(db, userId, planId, dayId, peId))) return null;

  const patch: Partial<typeof planExercises.$inferInsert> = {};
  if (input.targetSets !== undefined) patch.targetSets = input.targetSets;
  if (input.targetReps !== undefined) patch.targetReps = input.targetReps;
  if (input.targetWeight !== undefined) patch.targetWeight = input.targetWeight;
  if (input.restSeconds !== undefined) patch.restSeconds = input.restSeconds;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (Object.keys(patch).length > 0) {
    await db.update(planExercises).set(patch).where(eq(planExercises.id, peId));
    await touchPlan(db, planId);
  }
  return getPlanDetail(db, userId, planId);
}

export async function deletePlanExercise(
  db: Db,
  userId: string,
  planId: string,
  dayId: string,
  peId: string,
): Promise<PlanDetailDto | null> {
  if (!(await planExerciseInOwnedPlan(db, userId, planId, dayId, peId))) return null;
  await db.delete(planExercises).where(eq(planExercises.id, peId));
  await touchPlan(db, planId);
  return getPlanDetail(db, userId, planId);
}
