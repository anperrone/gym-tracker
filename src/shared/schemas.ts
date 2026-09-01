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
