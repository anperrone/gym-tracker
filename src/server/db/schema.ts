import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  index,
  integer,
  real,
  sqliteTable,
  text,
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
