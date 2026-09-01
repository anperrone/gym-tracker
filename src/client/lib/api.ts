import {
  type CreateExerciseInput,
  type CreateMeasurementInput,
  type CreatePlanDayInput,
  type CreatePlanExerciseInput,
  type CreatePlanInput,
  type ExerciseDto,
  type ExerciseFilters,
  exerciseSchema,
  type HealthResponse,
  healthResponseSchema,
  type MeasurementEntryDto,
  type MeasurementSeriesPoint,
  type MeasurementTypeDto,
  type MeResponse,
  measurementEntrySchema,
  measurementSeriesPointSchema,
  measurementTypeSchema,
  meResponseSchema,
  type PlanDetailDto,
  type PlanSummaryDto,
  planDetailSchema,
  planSummarySchema,
  type UpdateExerciseInput,
  type UpdatePlanExerciseInput,
  type UpdatePlanInput,
} from '@shared/schemas';
import { type ZodType, z } from 'zod';

/** Errore di richiesta API con status HTTP. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** GET tipizzato: esegue la fetch e valida la risposta con lo schema Zod fornito. */
async function getJson<T>(path: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new ApiError(res.status, `Richiesta fallita: ${res.status}`);
  }
  return schema.parse(await res.json());
}

export function fetchHealth(): Promise<HealthResponse> {
  return getJson('/api/health', healthResponseSchema);
}

/** Profilo utente corrente; `null` se non autenticato (401). */
export async function fetchMe(): Promise<MeResponse | null> {
  const res = await fetch('/api/me', { headers: { Accept: 'application/json' } });
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new ApiError(res.status, `Richiesta fallita: ${res.status}`);
  }
  return meResponseSchema.parse(await res.json());
}

export async function logout(): Promise<void> {
  const res = await fetch('/auth/logout', { method: 'POST' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Logout fallito');
  }
}

// --- Misure ---

export function fetchMeasurementTypes(): Promise<MeasurementTypeDto[]> {
  return getJson('/api/measurements/types', z.array(measurementTypeSchema));
}

export function fetchMeasurements(): Promise<MeasurementEntryDto[]> {
  return getJson('/api/measurements', z.array(measurementEntrySchema));
}

export function fetchMeasurementSeries(typeId: string): Promise<MeasurementSeriesPoint[]> {
  return getJson(`/api/measurements/series/${typeId}`, z.array(measurementSeriesPointSchema));
}

export async function createMeasurement(input: CreateMeasurementInput): Promise<void> {
  const res = await fetch('/api/measurements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Creazione misurazione fallita');
  }
}

export async function deleteMeasurement(id: string): Promise<void> {
  const res = await fetch(`/api/measurements/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Eliminazione fallita');
  }
}

// --- Esercizi ---

export function fetchExercises(filters: ExerciseFilters = {}): Promise<ExerciseDto[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.equipment) params.set('equipment', filters.equipment);
  const qs = params.toString();
  return getJson(`/api/exercises${qs ? `?${qs}` : ''}`, z.array(exerciseSchema));
}

export async function createExercise(input: CreateExerciseInput): Promise<ExerciseDto> {
  const res = await fetch('/api/exercises', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Creazione esercizio fallita');
  }
  return exerciseSchema.parse(await res.json());
}

export async function updateExercise(id: string, input: UpdateExerciseInput): Promise<ExerciseDto> {
  const res = await fetch(`/api/exercises/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'Aggiornamento esercizio fallito');
  }
  return exerciseSchema.parse(await res.json());
}

export async function deleteExercise(id: string): Promise<void> {
  const res = await fetch(`/api/exercises/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Eliminazione fallita');
  }
}

// --- Schede ---

/** POST/PATCH/DELETE tipizzato con validazione della risposta. */
async function sendJson<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  schema: ZodType<T>,
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Richiesta fallita: ${res.status}`);
  }
  return schema.parse(await res.json());
}

export function fetchPlans(): Promise<PlanSummaryDto[]> {
  return getJson('/api/plans', z.array(planSummarySchema));
}

export function fetchPlanDetail(id: string): Promise<PlanDetailDto> {
  return getJson(`/api/plans/${id}`, planDetailSchema);
}

export function createPlan(input: CreatePlanInput): Promise<PlanSummaryDto> {
  return sendJson('/api/plans', 'POST', planSummarySchema, input);
}

export function updatePlan(id: string, input: UpdatePlanInput): Promise<PlanSummaryDto> {
  return sendJson(`/api/plans/${id}`, 'PATCH', planSummarySchema, input);
}

export async function deletePlan(id: string): Promise<void> {
  const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new ApiError(res.status, 'Eliminazione fallita');
  }
}

export function addPlanDay(planId: string, input: CreatePlanDayInput): Promise<PlanDetailDto> {
  return sendJson(`/api/plans/${planId}/days`, 'POST', planDetailSchema, input);
}

export function deletePlanDay(planId: string, dayId: string): Promise<PlanDetailDto> {
  return sendJson(`/api/plans/${planId}/days/${dayId}`, 'DELETE', planDetailSchema);
}

export function addPlanExercise(
  planId: string,
  dayId: string,
  input: CreatePlanExerciseInput,
): Promise<PlanDetailDto> {
  return sendJson(`/api/plans/${planId}/days/${dayId}/exercises`, 'POST', planDetailSchema, input);
}

export function updatePlanExercise(
  planId: string,
  dayId: string,
  peId: string,
  input: UpdatePlanExerciseInput,
): Promise<PlanDetailDto> {
  return sendJson(
    `/api/plans/${planId}/days/${dayId}/exercises/${peId}`,
    'PATCH',
    planDetailSchema,
    input,
  );
}

export function deletePlanExercise(
  planId: string,
  dayId: string,
  peId: string,
): Promise<PlanDetailDto> {
  return sendJson(
    `/api/plans/${planId}/days/${dayId}/exercises/${peId}`,
    'DELETE',
    planDetailSchema,
  );
}
