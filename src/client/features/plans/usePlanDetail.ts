import type {
  CreatePlanExerciseInput,
  PlanDetailDto,
  UpdatePlanExerciseInput,
} from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { planKeys } from './usePlans';

export function usePlanDetail(id: string) {
  return useQuery({
    queryKey: planKeys.detail(id),
    queryFn: () => api.fetchPlanDetail(id),
    enabled: id !== '',
  });
}

/** Mutation che restituisce il dettaglio aggiornato: aggiorna la cache del dettaglio + invalida la lista. */
function useDetailMutation<TArgs>(planId: string, fn: (args: TArgs) => Promise<PlanDetailDto>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (detail) => {
      qc.setQueryData(planKeys.detail(planId), detail);
      qc.invalidateQueries({ queryKey: planKeys.list });
    },
  });
}

/** Tutte le mutation del plan builder per una scheda. */
export function usePlanMutations(planId: string) {
  return {
    addDay: useDetailMutation(planId, (name: string) => api.addPlanDay(planId, { name })),
    renameDay: useDetailMutation(planId, (args: { dayId: string; name: string }) =>
      api.renamePlanDay(planId, args.dayId, args.name),
    ),
    deleteDay: useDetailMutation(planId, (dayId: string) => api.deletePlanDay(planId, dayId)),
    addExercise: useDetailMutation(
      planId,
      (args: { dayId: string; input: CreatePlanExerciseInput }) =>
        api.addPlanExercise(planId, args.dayId, args.input),
    ),
    updateExercise: useDetailMutation(
      planId,
      (args: { dayId: string; peId: string; input: UpdatePlanExerciseInput }) =>
        api.updatePlanExercise(planId, args.dayId, args.peId, args.input),
    ),
    deleteExercise: useDetailMutation(planId, (args: { dayId: string; peId: string }) =>
      api.deletePlanExercise(planId, args.dayId, args.peId),
    ),
  };
}
