import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

const keys = {
  types: ['measurement-types'] as const,
  list: ['measurements'] as const,
  series: (typeId: string) => ['measurement-series', typeId] as const,
};

export function useMeasurementTypes() {
  return useQuery({
    queryKey: keys.types,
    queryFn: api.fetchMeasurementTypes,
    staleTime: 5 * 60_000,
  });
}

export function useMeasurements() {
  return useQuery({ queryKey: keys.list, queryFn: api.fetchMeasurements });
}

export function useMeasurementSeries(typeId: string) {
  return useQuery({
    queryKey: keys.series(typeId),
    queryFn: () => api.fetchMeasurementSeries(typeId),
    enabled: typeId !== '',
  });
}

function useInvalidateMeasurements() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: keys.list });
    await queryClient.invalidateQueries({ queryKey: ['measurement-series'] });
  };
}

export function useCreateMeasurement() {
  const invalidate = useInvalidateMeasurements();
  return useMutation({ mutationFn: api.createMeasurement, onSuccess: invalidate });
}

export function useDeleteMeasurement() {
  const invalidate = useInvalidateMeasurements();
  return useMutation({ mutationFn: api.deleteMeasurement, onSuccess: invalidate });
}
