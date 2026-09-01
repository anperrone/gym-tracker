import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

export const planKeys = {
  list: ['plans'] as const,
  detail: (id: string) => ['plan', id] as const,
};

export function usePlans() {
  return useQuery({ queryKey: planKeys.list, queryFn: api.fetchPlans });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createPlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.list }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deletePlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.list }),
  });
}

export function useSetPlanActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; isActive: boolean }) =>
      api.updatePlan(args.id, { isActive: args.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.list }),
  });
}
