import type { Equipment, ExerciseFilters } from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

/** Etichette in italiano per le attrezzature (ordine di visualizzazione). */
export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  machine: 'Macchine',
  barbell: 'Bilanciere',
  dumbbell: 'Manubri',
  cable: 'Cavi',
  bodyweight: 'Corpo libero',
  kettlebell: 'Kettlebell',
  cardio: 'Cardio',
  other: 'Altro',
};

export const EQUIPMENT_OPTIONS = Object.entries(EQUIPMENT_LABELS) as [Equipment, string][];

const keys = {
  list: (filters: ExerciseFilters) => ['exercises', filters] as const,
};

export function useExercises(filters: ExerciseFilters = {}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: () => api.fetchExercises(filters),
    staleTime: 60_000,
  });
}

function useInvalidateExercises() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['exercises'] });
}

export function useCreateExercise() {
  const invalidate = useInvalidateExercises();
  return useMutation({ mutationFn: api.createExercise, onSuccess: invalidate });
}

export function useUpdateExercise() {
  const invalidate = useInvalidateExercises();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; canonicalExerciseId: string | null }) =>
      api.updateExercise(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteExercise() {
  const invalidate = useInvalidateExercises();
  return useMutation({ mutationFn: api.deleteExercise, onSuccess: invalidate });
}
