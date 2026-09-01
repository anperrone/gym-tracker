import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation che restituisce un DTO di dettaglio aggiornato: scrive la cache del dettaglio
 * e invalida la lista. Condivisa da schede e allenamenti (parametrizzata sulle query key).
 */
export function useDetailMutation<TDetail, TArgs>(
  detailKey: readonly unknown[],
  listKey: readonly unknown[],
  fn: (args: TArgs) => Promise<TDetail>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (detail) => {
      qc.setQueryData(detailKey, detail);
      qc.invalidateQueries({ queryKey: listKey });
    },
  });
}
