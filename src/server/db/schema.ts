import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { EQUIPMENT_VALUES } from '../../shared/schemas';

// Schema Drizzle (D1 / SQLite).

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  googleSub: text('google_sub').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['user', 'admin'] })
    .notNull()
    .default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const sessions = sqliteTable(
  'sessions',
  {
    // id = hash SHA-256 del token di sessione (il token in chiaro sta solo nel cookie).
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type UserRole = User['role'];

// --- Misure corporee (M2) ---

// Tipi di metrica: user_id NULL = default di sistema; valorizzato = custom utente.
export const measurementTypes = sqliteTable(
  'measurement_types',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    label: text('label').notNull(),
    unit: text('unit').notNull(),
    precision: integer('precision').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [index('measurement_types_user_id_idx').on(t.userId)],
);

// Una misurazione (a una certa data) contiene N valori, uno per metrica.
export const measurementEntries = sqliteTable(
  'measurement_entries',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    measuredAt: integer('measured_at', { mode: 'timestamp' }).notNull(),
    notes: text('notes'),
    clientId: text('client_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [index('measurement_entries_user_id_idx').on(t.userId)],
);

export const measurementValues = sqliteTable(
  'measurement_values',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => measurementEntries.id, { onDelete: 'cascade' }),
    typeId: text('type_id')
      .notNull()
      .references(() => measurementTypes.id, { onDelete: 'cascade' }),
    value: real('value').notNull(),
  },
  (t) => [index('measurement_values_entry_id_idx').on(t.entryId)],
);

export type MeasurementType = typeof measurementTypes.$inferSelect;
export type NewMeasurementType = typeof measurementTypes.$inferInsert;
export type MeasurementEntry = typeof measurementEntries.$inferSelect;
export type NewMeasurementEntry = typeof measurementEntries.$inferInsert;
export type MeasurementValue = typeof measurementValues.$inferSelect;
export type NewMeasurementValue = typeof measurementValues.$inferInsert;

// --- Catalogo esercizi (M3) ---

// Sorgente unica dei valori equipment: la tupla condivisa (evita drift DB/API/UI).
export const EQUIPMENT = EQUIPMENT_VALUES;

// Esercizi: user_id NULL = catalogo globale (curato dall'admin); valorizzato = custom utente.
// canonical_exercise_id collega un custom/testo libero a una voce di catalogo per unificare la progressione.
export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    muscleGroup: text('muscle_group'),
    equipment: text('equipment', { enum: EQUIPMENT }).notNull().default('other'),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    canonicalExerciseId: text('canonical_exercise_id').references(
      (): AnySQLiteColumn => exercises.id,
      { onDelete: 'set null' },
    ),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index('exercises_user_id_idx').on(t.userId),
    index('exercises_equipment_idx').on(t.equipment),
  ],
);

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Equipment = (typeof EQUIPMENT)[number];

// --- Schede (workout plans) (M4) ---

export const workoutPlans = sqliteTable(
  'workout_plans',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [index('workout_plans_user_id_idx').on(t.userId)],
);

// Un giorno della scheda (es. "Giorno A / Push").
export const planDays = sqliteTable(
  'plan_days',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id')
      .notNull()
      .references(() => workoutPlans.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('plan_days_plan_id_idx').on(t.planId)],
);

// Un esercizio pianificato in un giorno, con i target. target_reps è testo (es. "8-12").
export const planExercises = sqliteTable(
  'plan_exercises',
  {
    id: text('id').primaryKey(),
    planDayId: text('plan_day_id')
      .notNull()
      .references(() => planDays.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    targetSets: integer('target_sets'),
    targetReps: text('target_reps'),
    targetWeight: real('target_weight'),
    restSeconds: integer('rest_seconds'),
    notes: text('notes'),
  },
  (t) => [index('plan_exercises_plan_day_id_idx').on(t.planDayId)],
);

export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type NewWorkoutPlan = typeof workoutPlans.$inferInsert;
export type PlanDay = typeof planDays.$inferSelect;
export type NewPlanDay = typeof planDays.$inferInsert;
export type PlanExercise = typeof planExercises.$inferSelect;
export type NewPlanExercise = typeof planExercises.$inferInsert;

// --- Allenamenti svolti / log (M5) ---

// Una sessione di allenamento. plan_day_id NULL = allenamento libero.
// client_id abilita l'upsert idempotente (replay/offline).
export const workoutSessions = sqliteTable(
  'workout_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planDayId: text('plan_day_id').references(() => planDays.id, { onDelete: 'set null' }),
    performedAt: integer('performed_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    durationSeconds: integer('duration_seconds'),
    notes: text('notes'),
    status: text('status', { enum: ['in_progress', 'completed'] })
      .notNull()
      .default('in_progress'),
    clientId: text('client_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index('workout_sessions_user_id_idx').on(t.userId),
    // Unique per idempotenza: un replay dello stesso (user, client_id) non duplica.
    // I client_id NULL (inserimenti diretti) restano distinti in SQLite.
    uniqueIndex('workout_sessions_user_client_idx').on(t.userId, t.clientId),
  ],
);

// Esercizio svolto: nome/attrezzatura sono uno **snapshot** al momento del log, così la
// storia resta anche se la voce di catalogo viene eliminata (exercise_id → set null).
export const sessionExercises = sqliteTable(
  'session_exercises',
  {
    id: text('id').primaryKey(),
    workoutSessionId: text('workout_session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id').references(() => exercises.id, { onDelete: 'set null' }),
    exerciseName: text('exercise_name').notNull(),
    equipment: text('equipment', { enum: EQUIPMENT }).notNull().default('other'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('session_exercises_session_id_idx').on(t.workoutSessionId)],
);

// Una serie: peso e reps indipendenti per riga (supporta piramidali/drop set).
export const sessionSets = sqliteTable(
  'session_sets',
  {
    id: text('id').primaryKey(),
    sessionExerciseId: text('session_exercise_id')
      .notNull()
      .references(() => sessionExercises.id, { onDelete: 'cascade' }),
    setNumber: integer('set_number').notNull(),
    weight: real('weight'),
    reps: integer('reps'),
    notes: text('notes'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('session_sets_session_exercise_id_idx').on(t.sessionExerciseId)],
);

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;
export type SessionExercise = typeof sessionExercises.$inferSelect;
export type NewSessionExercise = typeof sessionExercises.$inferInsert;
export type SessionSet = typeof sessionSets.$inferSelect;
export type NewSessionSet = typeof sessionSets.$inferInsert;
export type WorkoutStatus = WorkoutSession['status'];
