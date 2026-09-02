import { and, asc, eq, isNull } from 'drizzle-orm';
import type {
  AdminUserDto,
  CreateGlobalExerciseInput,
  ExerciseDto,
  SetUserDisabledInput,
  UpdateGlobalExerciseInput,
  UpdateUserRoleInput,
} from '../../../shared/schemas';
import type { Db } from '../client';
import { exercises, planExercises, sessions, users } from '../schema';
import { exerciseToDto } from './exercises';

/** Elenca **solo** il catalogo globale (user_id NULL); i custom degli utenti sono esclusi. */
export async function listGlobalExercises(db: Db): Promise<ExerciseDto[]> {
  const rows = await db
    .select()
    .from(exercises)
    .where(isNull(exercises.userId))
    .orderBy(asc(exercises.name));
  return rows.map(exerciseToDto);
}

/** Crea un esercizio del catalogo globale (user_id NULL, non custom). */
export async function createGlobalExercise(
  db: Db,
  input: CreateGlobalExerciseInput,
): Promise<ExerciseDto> {
  const [row] = await db
    .insert(exercises)
    .values({
      id: crypto.randomUUID(),
      userId: null,
      name: input.name,
      muscleGroup: input.muscleGroup ?? null,
      equipment: input.equipment,
      isCustom: false,
      canonicalExerciseId: null,
    })
    .returning();
  return exerciseToDto(row);
}

export type UpdateGlobalExerciseResult =
  | { ok: true; exercise: ExerciseDto }
  | { ok: false; error: 'not_found' };

/** Modifica un esercizio globale. Opera **solo** su voci globali (mai sui custom degli utenti). */
export async function updateGlobalExercise(
  db: Db,
  exerciseId: string,
  input: UpdateGlobalExerciseInput,
): Promise<UpdateGlobalExerciseResult> {
  const onlyGlobal = and(eq(exercises.id, exerciseId), isNull(exercises.userId));

  const set: Partial<typeof exercises.$inferInsert> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.equipment !== undefined) set.equipment = input.equipment;
  if (input.muscleGroup !== undefined) set.muscleGroup = input.muscleGroup;

  // Patch vuota: nessun campo da aggiornare → ritorna la voce corrente (se globale).
  if (Object.keys(set).length === 0) {
    const [row] = await db.select().from(exercises).where(onlyGlobal);
    return row ? { ok: true, exercise: exerciseToDto(row) } : { ok: false, error: 'not_found' };
  }

  const [row] = await db.update(exercises).set(set).where(onlyGlobal).returning();
  return row ? { ok: true, exercise: exerciseToDto(row) } : { ok: false, error: 'not_found' };
}

export type DeleteGlobalExerciseResult =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'in_use'; planCount?: number };

/**
 * Elimina un esercizio globale. Rifiuta se inesistente/custom (`not_found`) o se è **usato in
 * una o più schede** (`in_use`): `plan_exercises.exercise_id` ha FK ON DELETE cascade, quindi
 * eliminarlo cancellerebbe silenziosamente righe di schede di altri utenti. Le sessioni svolte
 * non bloccano: conservano uno snapshot del nome (exercise_id → NULL), la storia resta.
 */
export async function deleteGlobalExercise(
  db: Db,
  exerciseId: string,
): Promise<DeleteGlobalExerciseResult> {
  const [row] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), isNull(exercises.userId)));
  if (!row) return { ok: false, error: 'not_found' };

  const usage = await db
    .select({ id: planExercises.id })
    .from(planExercises)
    .where(eq(planExercises.exerciseId, exerciseId));
  if (usage.length > 0) return { ok: false, error: 'in_use', planCount: usage.length };

  await db.delete(exercises).where(eq(exercises.id, exerciseId));
  return { ok: true };
}

// --- Utenti/ruoli ---

function toUserDto(row: typeof users.$inferSelect): AdminUserDto {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    disabledAt: row.disabledAt ? row.disabledAt.toISOString() : null,
  };
}

/** Elenca gli utenti per il pannello admin. Espone **solo** campi non personali. */
export async function listUsers(db: Db): Promise<AdminUserDto[]> {
  const rows = await db.select().from(users).orderBy(asc(users.createdAt));
  return rows.map(toUserDto);
}

export type UpdateUserRoleResult =
  | { ok: true; user: AdminUserDto }
  | { ok: false; error: 'not_found' | 'self_forbidden' };

/**
 * Cambia il ruolo di un utente (user/admin). Un admin **non** può cambiare il **proprio** ruolo
 * (`self_forbidden`): impedisce un self-lockout e garantisce che resti sempre almeno un admin.
 */
export async function updateUserRole(
  db: Db,
  actingUserId: string,
  userId: string,
  input: UpdateUserRoleInput,
): Promise<UpdateUserRoleResult> {
  if (userId === actingUserId) return { ok: false, error: 'self_forbidden' };

  const [row] = await db
    .update(users)
    .set({ role: input.role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row ? { ok: true, user: toUserDto(row) } : { ok: false, error: 'not_found' };
}

export type SetUserDisabledResult =
  | { ok: true; user: AdminUserDto }
  | { ok: false; error: 'not_found' | 'self_forbidden' };

/**
 * Abilita/disabilita un account. Un admin **non** può disabilitare sé stesso
 * (`self_forbidden`): evita il self-lockout. Disabilitando si **revocano subito
 * tutte le sessioni** dell'utente (logout immediato su ogni dispositivo).
 */
export async function setUserDisabled(
  db: Db,
  actingUserId: string,
  userId: string,
  input: SetUserDisabledInput,
): Promise<SetUserDisabledResult> {
  if (userId === actingUserId) return { ok: false, error: 'self_forbidden' };

  const [row] = await db
    .update(users)
    .set({ disabledAt: input.disabled ? new Date() : null, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  if (!row) return { ok: false, error: 'not_found' };

  if (input.disabled) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
  return { ok: true, user: toUserDto(row) };
}
