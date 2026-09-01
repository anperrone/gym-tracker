import type { CreatePlanExerciseInput, UpdatePlanExerciseInput } from '@shared/schemas';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { useDetailMutation } from '@/lib/detailMutation';
import { planKeys } from './usePlans';

export function usePlanDetail(id: string) {
  return useQuery({
    queryKey: planKeys.detail(id),
    queryFn: () => api.fetchPlanDetail(id),
    enabled: id !== '',
    // Il builder ha input controllati editabili: un refetch al focus li sovrascriverebbe.
    refetchOnWindowFocus: false,
  });
}

/** Tutte le mutation del plan builder per una scheda. */
export function usePlanMutations(planId: string) {
  const detailKey = planKeys.detail(planId);
  return {
    addDay: useDetailMutation(detailKey, planKeys.list, (name: string) =>
      api.addPlanDay(planId, { name }),
    ),
    deleteDay: useDetailMutation(detailKey, planKeys.list, (dayId: string) =>
      api.deletePlanDay(planId, dayId),
    ),
    addExercise: useDetailMutation(
      detailKey,
      planKeys.list,
      (args: { dayId: string; input: CreatePlanExerciseInput }) =>
        api.addPlanExercise(planId, args.dayId, args.input),
    ),
    updateExercise: useDetailMutation(
      detailKey,
      planKeys.list,
      (args: { dayId: string; peId: string; input: UpdatePlanExerciseInput }) =>
        api.updatePlanExercise(planId, args.dayId, args.peId, args.input),
    ),
    deleteExercise: useDetailMutation(
      detailKey,
      planKeys.list,
      (args: { dayId: string; peId: string }) =>
        api.deletePlanExercise(planId, args.dayId, args.peId),
    ),
  };
}
