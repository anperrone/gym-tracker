import type { StartSessionInput } from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

export const workoutKeys = {
  list: ['sessions'] as const,
  detail: (id: string) => ['session', id] as const,
};

export function useSessions() {
  return useQuery({ queryKey: workoutKeys.list, queryFn: api.fetchSessions });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StartSessionInput) => api.startSession(input),
    onSuccess: (detail) => {
      qc.setQueryData(workoutKeys.detail(detail.id), detail);
      qc.invalidateQueries({ queryKey: workoutKeys.list });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: workoutKeys.list }),
  });
}
