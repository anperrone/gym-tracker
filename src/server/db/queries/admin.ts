import { and, asc, eq, isNull } from 'drizzle-orm';
import type {
  AdminUserDto,
  CreateGlobalExerciseInput,
  ExerciseDto,
  UpdateGlobalExerciseInput,
  UpdateUserRoleInput,
} from '../../../shared/schemas';
import type { Db } from '../client';
import { exercises, users } from '../schema';

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

/** Elenca **solo** il catalogo globale (user_id NULL); i custom degli utenti sono esclusi. */
export async function listGlobalExercises(db: Db): Promise<ExerciseDto[]> {
  const rows = await db
    .select()
    .from(exercises)
    .where(isNull(exercises.userId))
    .orderBy(asc(exercises.name));
  return rows.map(toDto);
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
  return toDto(row);
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
    return row ? { ok: true, exercise: toDto(row) } : { ok: false, error: 'not_found' };
  }

  const [row] = await db.update(exercises).set(set).where(onlyGlobal).returning();
  return row ? { ok: true, exercise: toDto(row) } : { ok: false, error: 'not_found' };
}

/** Elimina un esercizio globale. False se inesistente o **custom** di un utente. */
export async function deleteGlobalExercise(db: Db, exerciseId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), isNull(exercises.userId)));
  if (!row) return false;

  await db.delete(exercises).where(eq(exercises.id, exerciseId));
  return true;
}

// --- Utenti/ruoli ---

function toUserDto(row: typeof users.$inferSelect): AdminUserDto {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Elenca gli utenti per il pannello admin. Espone **solo** campi non personali. */
export async function listUsers(db: Db): Promise<AdminUserDto[]> {
  const rows = await db.select().from(users).orderBy(asc(users.createdAt));
  return rows.map(toUserDto);
}

export type UpdateUserRoleResult =
  | { ok: true; user: AdminUserDto }
  | { ok: false; error: 'not_found' };

/** Cambia il ruolo di un utente (user/admin). */
export async function updateUserRole(
  db: Db,
  userId: string,
  input: UpdateUserRoleInput,
): Promise<UpdateUserRoleResult> {
  const [row] = await db
    .update(users)
    .set({ role: input.role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row ? { ok: true, user: toUserDto(row) } : { ok: false, error: 'not_found' };
}
