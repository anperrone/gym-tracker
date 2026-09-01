import type { CreateSetInput, UpdateSetInput } from '@shared/schemas';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { useDetailMutation } from '@/lib/detailMutation';
import { applyAddSet, applyDeleteSet, applyUpdateSet } from '@/lib/optimistic';
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

/** Tutte le mutation di una sessione (logging). */
export function useSessionMutations(id: string) {
  const detailKey = workoutKeys.detail(id);
  return {
    addExercise: useDetailMutation(detailKey, workoutKeys.list, (exerciseId: string) =>
      api.addSessionExercise(id, exerciseId),
    ),
    deleteExercise: useDetailMutation(detailKey, workoutKeys.list, (seId: string) =>
      api.deleteSessionExercise(id, seId),
    ),
    // Le mutation delle serie sono ottimistiche: l'inserimento offline è immediato e
    // viene sincronizzato alla riconnessione (la coda in pausa si riprende una sola volta,
    // quindi niente doppie POST; gli endpoint /sets non hanno un client_id proprio).
    addSet: useDetailMutation(
      detailKey,
      workoutKeys.list,
      (args: { seId: string; input: CreateSetInput }) => api.addSet(id, args.seId, args.input),
      (current, args) => applyAddSet(current, args.seId, args.input),
    ),
    updateSet: useDetailMutation(
      detailKey,
      workoutKeys.list,
      (args: { seId: string; setId: string; input: UpdateSetInput }) =>
        api.updateSet(id, args.seId, args.setId, args.input),
      (current, args) => applyUpdateSet(current, args.seId, args.setId, args.input),
    ),
    deleteSet: useDetailMutation(
      detailKey,
      workoutKeys.list,
      (args: { seId: string; setId: string }) => api.deleteSet(id, args.seId, args.setId),
      (current, args) => applyDeleteSet(current, args.seId, args.setId),
    ),
    complete: useDetailMutation(detailKey, workoutKeys.list, (durationSeconds?: number) =>
      api.updateSession(id, {
        status: 'completed',
        ...(durationSeconds != null ? { durationSeconds } : {}),
      }),
    ),
  };
}
