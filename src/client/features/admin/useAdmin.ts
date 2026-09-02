import type { UpdateGlobalExerciseInput, UserRole } from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

export const adminKeys = {
  exercises: ['admin', 'exercises'] as const,
  users: ['admin', 'users'] as const,
};

export function useAdminExercises() {
  return useQuery({ queryKey: adminKeys.exercises, queryFn: api.fetchAdminExercises });
}

export function useCreateAdminExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createAdminExercise,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.exercises }),
  });
}

export function useUpdateAdminExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateGlobalExerciseInput }) =>
      api.updateAdminExercise(args.id, args.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.exercises }),
  });
}

export function useDeleteAdminExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAdminExercise,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.exercises }),
  });
}

export function useAdminUsers() {
  return useQuery({ queryKey: adminKeys.users, queryFn: api.fetchAdminUsers });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; role: UserRole }) => api.updateUserRole(args.id, args.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users }),
  });
}
