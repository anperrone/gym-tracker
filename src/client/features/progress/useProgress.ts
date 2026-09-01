import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';

export function useProgressExercises() {
  return useQuery({
    queryKey: ['progress', 'exercises'],
    queryFn: api.fetchProgressExercises,
    staleTime: 60_000,
  });
}

export function useExerciseProgress(exerciseId: string) {
  return useQuery({
    queryKey: ['progress', 'exercise', exerciseId],
    queryFn: () => api.fetchExerciseProgress(exerciseId),
    enabled: exerciseId !== '',
  });
}
