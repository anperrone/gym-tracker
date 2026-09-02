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

/** Valori `equipment` — sorgente unica condivisa da DB (enum colonna), API (Zod) e UI. */
export const EQUIPMENT_VALUES = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'cardio',
  'other',
] as const;
export const equipmentSchema = z.enum(EQUIPMENT_VALUES);
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

// --- Admin: catalogo globale (M8) ---

/** Payload admin: crea un esercizio del catalogo globale. */
export const createGlobalExerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  equipment: equipmentSchema.default('other'),
  muscleGroup: z.string().trim().max(120).nullish(),
});
export type CreateGlobalExerciseInput = z.infer<typeof createGlobalExerciseSchema>;

/** Payload admin: modifica parziale (name/equipment/muscleGroup) di un esercizio globale. */
export const updateGlobalExerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    equipment: equipmentSchema,
    muscleGroup: z.string().trim().max(120).nullable(),
  })
  .partial();
export type UpdateGlobalExerciseInput = z.infer<typeof updateGlobalExerciseSchema>;

// --- Schede / workout plans (M4) ---

/** Voce di elenco delle schede (con conteggio giorni). */
export const planSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  dayCount: z.number().int(),
  createdAt: z.string(), // ISO
  updatedAt: z.string(), // ISO
});
export type PlanSummaryDto = z.infer<typeof planSummarySchema>;

/** Esercizio pianificato (lettura), con nome/attrezzatura dal catalogo. */
export const planExerciseSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string(),
  equipment: equipmentSchema,
  sortOrder: z.number().int(),
  targetSets: z.number().int().nullable(),
  targetReps: z.string().nullable(),
  targetWeight: z.number().nullable(),
  restSeconds: z.number().int().nullable(),
  notes: z.string().nullable(),
});
export type PlanExerciseDto = z.infer<typeof planExerciseSchema>;

/** Giorno della scheda con i suoi esercizi. */
export const planDaySchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  exercises: z.array(planExerciseSchema),
});
export type PlanDayDto = z.infer<typeof planDaySchema>;

/** Dettaglio completo di una scheda (giorni + esercizi annidati). */
export const planDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(), // ISO
  updatedAt: z.string(), // ISO
  days: z.array(planDaySchema),
});
export type PlanDetailDto = z.infer<typeof planDetailSchema>;

export const createPlanSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullish(),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export const createPlanDaySchema = z.object({
  name: z.string().trim().min(1).max(120),
});
export type CreatePlanDayInput = z.infer<typeof createPlanDaySchema>;

/** Target di un esercizio pianificato (usato in create/update). */
export const createPlanExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  targetSets: z.number().int().min(1).max(50).nullish(),
  targetReps: z.string().trim().max(40).nullish(),
  targetWeight: z.number().finite().min(0).max(10000).nullish(),
  restSeconds: z.number().int().min(0).max(3600).nullish(),
  notes: z.string().trim().max(500).nullish(),
});
export type CreatePlanExerciseInput = z.infer<typeof createPlanExerciseSchema>;

export const updatePlanExerciseSchema = z.object({
  targetSets: z.number().int().min(1).max(50).nullable().optional(),
  targetReps: z.string().trim().max(40).nullable().optional(),
  targetWeight: z.number().finite().min(0).max(10000).nullable().optional(),
  restSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type UpdatePlanExerciseInput = z.infer<typeof updatePlanExerciseSchema>;

// --- Allenamenti svolti / log (M5) ---

export const workoutStatusSchema = z.enum(['in_progress', 'completed']);
export type WorkoutStatus = z.infer<typeof workoutStatusSchema>;

/** Una serie svolta (lettura): peso e reps indipendenti. */
export const sessionSetSchema = z.object({
  id: z.string(),
  setNumber: z.number().int(),
  weight: z.number().nullable(),
  reps: z.number().int().nullable(),
  notes: z.string().nullable(),
  completed: z.boolean(),
});
export type SessionSetDto = z.infer<typeof sessionSetSchema>;

export const sessionExerciseSchema = z.object({
  id: z.string(),
  // Null se la voce di catalogo è stata eliminata dopo il log (lo snapshot del nome resta).
  exerciseId: z.string().nullable(),
  exerciseName: z.string(),
  equipment: equipmentSchema,
  sortOrder: z.number().int(),
  sets: z.array(sessionSetSchema),
});
export type SessionExerciseDto = z.infer<typeof sessionExerciseSchema>;

/** Dettaglio completo di una sessione (esercizi + serie annidati). */
export const workoutSessionDetailSchema = z.object({
  id: z.string(),
  planDayId: z.string().nullable(),
  status: workoutStatusSchema,
  performedAt: z.string(), // ISO
  durationSeconds: z.number().int().nullable(),
  notes: z.string().nullable(),
  exercises: z.array(sessionExerciseSchema),
});
export type WorkoutSessionDetailDto = z.infer<typeof workoutSessionDetailSchema>;

/** Voce di elenco delle sessioni. */
export const workoutSessionSummarySchema = z.object({
  id: z.string(),
  status: workoutStatusSchema,
  performedAt: z.string(), // ISO
  planDayId: z.string().nullable(),
  exerciseCount: z.number().int(),
  setCount: z.number().int(),
});
export type WorkoutSessionSummaryDto = z.infer<typeof workoutSessionSummarySchema>;

const isoDate = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Data non valida' });

/** Avvio sessione (idempotente per clientId). planDayId opzionale → pre-popola dagli esercizi del giorno. */
export const startSessionSchema = z.object({
  clientId: z.string().min(1),
  planDayId: z.string().min(1).nullish(),
  performedAt: isoDate.nullish(),
  notes: z.string().trim().max(1000).nullish(),
});
export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const updateSessionSchema = z.object({
  status: workoutStatusSchema.optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  durationSeconds: z.number().int().min(0).max(86_400).nullable().optional(),
  performedAt: isoDate.optional(),
});
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

export const addSessionExerciseSchema = z.object({ exerciseId: z.string().min(1) });
export type AddSessionExerciseInput = z.infer<typeof addSessionExerciseSchema>;

export const createSetSchema = z.object({
  weight: z.number().finite().min(0).max(10000).nullish(),
  reps: z.number().int().min(0).max(1000).nullish(),
  notes: z.string().trim().max(500).nullish(),
  completed: z.boolean().optional(),
});
export type CreateSetInput = z.infer<typeof createSetSchema>;

export const updateSetSchema = z.object({
  weight: z.number().finite().min(0).max(10000).nullable().optional(),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  completed: z.boolean().optional(),
});
export type UpdateSetInput = z.infer<typeof updateSetSchema>;

// --- Progressi (M7) ---

/** Esercizio con dati loggati (voce dell'elenco progressi). */
export const progressExerciseSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  sessionCount: z.number().int(),
  bestWeight: z.number(),
  best1RM: z.number(),
  lastPerformedAt: z.string(), // ISO
});
export type ProgressExerciseDto = z.infer<typeof progressExerciseSchema>;

/** Punto della progressione di un esercizio (aggregato per sessione). */
export const progressPointSchema = z.object({
  date: z.string(), // ISO (performed_at della sessione)
  topWeight: z.number(),
  volume: z.number(),
  best1RM: z.number(),
});
export type ProgressPointDto = z.infer<typeof progressPointSchema>;
