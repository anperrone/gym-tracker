import type { CreateSetInput, UpdateSetInput, WorkoutSessionDetailDto } from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { workoutKeys } from './useWorkouts';

export function useWorkoutSession(id: string) {
  return useQuery({
    queryKey: workoutKeys.detail(id),
    queryFn: () => api.fetchSessionDetail(id),
    enabled: id !== '',
    // Input controllati editabili (peso/reps): niente refetch al focus.
    refetchOnWindowFocus: false,
  });
}

/** Mutation che restituisce il dettaglio aggiornato: aggiorna la cache del dettaglio + invalida la lista. */
function useDetailMutation<TArgs>(
  id: string,
  fn: (args: TArgs) => Promise<WorkoutSessionDetailDto>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (detail) => {
      qc.setQueryData(workoutKeys.detail(id), detail);
      qc.invalidateQueries({ queryKey: workoutKeys.list });
    },
  });
}

/** Tutte le mutation di una sessione (logging). */
export function useSessionMutations(id: string) {
  return {
    addExercise: useDetailMutation(id, (exerciseId: string) =>
      api.addSessionExercise(id, exerciseId),
    ),
    deleteExercise: useDetailMutation(id, (seId: string) => api.deleteSessionExercise(id, seId)),
    addSet: useDetailMutation(id, (args: { seId: string; input: CreateSetInput }) =>
      api.addSet(id, args.seId, args.input),
    ),
    updateSet: useDetailMutation(
      id,
      (args: { seId: string; setId: string; input: UpdateSetInput }) =>
        api.updateSet(id, args.seId, args.setId, args.input),
    ),
    deleteSet: useDetailMutation(id, (args: { seId: string; setId: string }) =>
      api.deleteSet(id, args.seId, args.setId),
    ),
    complete: useDetailMutation(id, (durationSeconds?: number) =>
      api.updateSession(id, {
        status: 'completed',
        ...(durationSeconds != null ? { durationSeconds } : {}),
      }),
    ),
  };
}
