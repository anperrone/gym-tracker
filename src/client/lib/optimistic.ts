import type { CreateSetInput, UpdateSetInput, WorkoutSessionDetailDto } from '@shared/schemas';

type SessionExercise = WorkoutSessionDetailDto['exercises'][number];

/** Applica una trasformazione all'esercizio con quell'id, immutabilmente. */
function mapExercise(
  detail: WorkoutSessionDetailDto,
  seId: string,
  fn: (ex: SessionExercise) => SessionExercise,
): WorkoutSessionDetailDto {
  return {
    ...detail,
    exercises: detail.exercises.map((ex) => (ex.id === seId ? fn(ex) : ex)),
  };
}

/** Aggiunge una serie in coda (id temporaneo finché non arriva la risposta del server). */
export function applyAddSet(
  detail: WorkoutSessionDetailDto,
  seId: string,
  input: CreateSetInput,
): WorkoutSessionDetailDto {
  return mapExercise(detail, seId, (ex) => {
    const nextNumber = ex.sets.reduce((max, s) => Math.max(max, s.setNumber), 0) + 1;
    return {
      ...ex,
      sets: [
        ...ex.sets,
        {
          id: `temp-${crypto.randomUUID()}`,
          setNumber: nextNumber,
          weight: input.weight ?? null,
          reps: input.reps ?? null,
          notes: input.notes ?? null,
          completed: input.completed ?? false,
        },
      ],
    };
  });
}

/** Aggiorna i campi forniti di una serie. */
export function applyUpdateSet(
  detail: WorkoutSessionDetailDto,
  seId: string,
  setId: string,
  input: UpdateSetInput,
): WorkoutSessionDetailDto {
  return mapExercise(detail, seId, (ex) => ({
    ...ex,
    sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...input } : s)),
  }));
}

/** Rimuove una serie. */
export function applyDeleteSet(
  detail: WorkoutSessionDetailDto,
  seId: string,
  setId: string,
): WorkoutSessionDetailDto {
  return mapExercise(detail, seId, (ex) => ({
    ...ex,
    sets: ex.sets.filter((s) => s.id !== setId),
  }));
}
