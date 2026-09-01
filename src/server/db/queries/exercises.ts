import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';
import type {
  CreateExerciseInput,
  ExerciseDto,
  ExerciseFilters,
  UpdateExerciseInput,
} from '../../../shared/schemas';
import type { Db } from '../client';
import { exercises } from '../schema';

function toDto(row: typeof exercises.$inferSelect): ExerciseDto {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscleGroup,
    equipment: row.equipment,
    isCustom: row.isCustom,
    canonicalExerciseId: row.canonicalExerciseId,
  };
}

/** Esercizi visibili all'utente: catalogo globale (user_id NULL) + suoi custom. */
export async function listExercises(
  db: Db,
  userId: string,
  filters: ExerciseFilters = {},
): Promise<ExerciseDto[]> {
  const visible = or(isNull(exercises.userId), eq(exercises.userId, userId));
  const conditions = [visible];

  if (filters.equipment) {
    conditions.push(eq(exercises.equipment, filters.equipment));
  }
  if (filters.search) {
    const term = `%${filters.search.toLowerCase()}%`;
    conditions.push(sql`lower(${exercises.name}) like ${term}`);
  }

  const rows = await db
    .select()
    .from(exercises)
    .where(and(...conditions))
    .orderBy(asc(exercises.name));

  return rows.map(toDto);
}

/** True se l'esercizio è visibile all'utente (globale o suo custom). */
async function isVisible(db: Db, userId: string, exerciseId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      and(eq(exercises.id, exerciseId), or(isNull(exercises.userId), eq(exercises.userId, userId))),
    );
  return row !== undefined;
}

export type CreateExerciseResult =
  | { ok: true; exercise: ExerciseDto }
  | { ok: false; error: 'invalid_canonical' };

/** Crea un esercizio custom per l'utente (testo libero). */
export async function createCustomExercise(
  db: Db,
  userId: string,
  input: CreateExerciseInput,
): Promise<CreateExerciseResult> {
  const canonicalId = input.canonicalExerciseId ?? null;
  if (canonicalId !== null && !(await isVisible(db, userId, canonicalId))) {
    return { ok: false, error: 'invalid_canonical' };
  }

  const id = crypto.randomUUID();
  const [row] = await db
    .insert(exercises)
    .values({
      id,
      userId,
      name: input.name,
      muscleGroup: input.muscleGroup ?? null,
      equipment: input.equipment,
      isCustom: true,
      canonicalExerciseId: canonicalId,
    })
    .returning();

  return { ok: true, exercise: toDto(row) };
}

export type UpdateExerciseResult =
  | { ok: true; exercise: ExerciseDto }
  | { ok: false; error: 'not_found' | 'invalid_canonical' };

/** Collega/scollega un esercizio custom di proprietà a una voce canonica. */
export async function updateExercise(
  db: Db,
  userId: string,
  exerciseId: string,
  input: UpdateExerciseInput,
): Promise<UpdateExerciseResult> {
  // Solo i propri esercizi custom sono modificabili.
  const [owned] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)));
  if (!owned) return { ok: false, error: 'not_found' };

  const canonicalId = input.canonicalExerciseId;
  if (canonicalId !== null) {
    // La canonica non può essere l'esercizio stesso e deve essere visibile.
    if (canonicalId === exerciseId || !(await isVisible(db, userId, canonicalId))) {
      return { ok: false, error: 'invalid_canonical' };
    }
  }

  const [row] = await db
    .update(exercises)
    .set({ canonicalExerciseId: canonicalId })
    .where(eq(exercises.id, exerciseId))
    .returning();

  return { ok: true, exercise: toDto(row) };
}

/** Elimina un esercizio custom di proprietà. False se inesistente/globale/non di proprietà. */
export async function deleteExercise(db: Db, userId: string, exerciseId: string): Promise<boolean> {
  const [owned] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)));
  if (!owned) return false;

  await db.delete(exercises).where(eq(exercises.id, exerciseId));
  return true;
}
