import { z } from 'zod';

/**
 * Schemi Zod condivisi tra client e server.
 * Il confine API valida sempre con questi schemi; i tipi si derivano con z.infer.
 * Le milestone successive aggiungono qui gli schemi di dominio (misure, esercizi, ...).
 */

export const healthResponseSchema = z.object({
  ok: z.boolean(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const userRoleSchema = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

/** Profilo dell'utente autenticato (risposta di GET /api/me). */
export const meResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: userRoleSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;

// --- Misure corporee (M2) ---

/** Tipo di metrica (default di sistema o custom utente). */
export const measurementTypeSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  unit: z.string(),
  precision: z.number().int(),
  sortOrder: z.number().int(),
  isCustom: z.boolean(),
});
export type MeasurementTypeDto = z.infer<typeof measurementTypeSchema>;

const measurementValueInputSchema = z.object({
  typeId: z.string().min(1),
  value: z.number().finite(),
});

/** Payload per creare una misurazione (una data + N valori). */
export const createMeasurementSchema = z.object({
  // Stringa data/ora parsabile (es. "2026-09-01" o ISO datetime).
  measuredAt: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Data non valida' }),
  notes: z.string().max(1000).nullish(),
  clientId: z.string().nullish(),
  values: z.array(measurementValueInputSchema).min(1),
});
export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>;

/** Una misurazione con i suoi valori (risposta API). */
export const measurementEntrySchema = z.object({
  id: z.string(),
  measuredAt: z.string(), // ISO
  notes: z.string().nullable(),
  values: z.array(z.object({ typeId: z.string(), value: z.number() })),
});
export type MeasurementEntryDto = z.infer<typeof measurementEntrySchema>;

/** Punto di una serie temporale per i grafici. */
export const measurementSeriesPointSchema = z.object({
  date: z.string(), // ISO
  value: z.number(),
});
export type MeasurementSeriesPoint = z.infer<typeof measurementSeriesPointSchema>;

// --- Catalogo esercizi (M3) ---

export const equipmentSchema = z.enum([
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'cardio',
  'other',
]);
export type Equipment = z.infer<typeof equipmentSchema>;

/** Esercizio del catalogo (globale o custom dell'utente). */
export const exerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  muscleGroup: z.string().nullable(),
  equipment: equipmentSchema,
  isCustom: z.boolean(),
  canonicalExerciseId: z.string().nullable(),
});
export type ExerciseDto = z.infer<typeof exerciseSchema>;

/** Payload per creare un esercizio custom (testo libero). */
export const createExerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  equipment: equipmentSchema.default('other'),
  muscleGroup: z.string().trim().max(120).nullish(),
  canonicalExerciseId: z.string().min(1).nullish(),
});
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;

/** Payload per collegare/scollegare un custom a una voce canonica. */
export const updateExerciseSchema = z.object({
  canonicalExerciseId: z.string().min(1).nullable(),
});
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;

/** Query di filtro per l'elenco esercizi. */
export const exerciseFiltersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  equipment: equipmentSchema.optional(),
});
export type ExerciseFilters = z.infer<typeof exerciseFiltersSchema>;
