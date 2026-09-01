import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation che restituisce un DTO di dettaglio aggiornato: scrive la cache del dettaglio
 * e invalida la lista. Condivisa da schede e allenamenti (parametrizzata sulle query key).
 *
 * Con `optimistic`, applica subito l'aggiornamento alla cache (anche offline, quando la
 * mutation è in pausa) — usato per il logging offline. In caso di errore riconcilia con il
 * server via refetch (non ripristina uno snapshot, che cancellerebbe gli update concorrenti).
 */
export function useDetailMutation<TDetail, TArgs>(
  detailKey: readonly unknown[],
  listKey: readonly unknown[],
  fn: (args: TArgs) => Promise<TDetail>,
  optimistic?: (current: TDetail, args: TArgs) => TDetail,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onMutate: optimistic
      ? async (args: TArgs) => {
          await qc.cancelQueries({ queryKey: detailKey });
          const previous = qc.getQueryData<TDetail>(detailKey);
          if (previous !== undefined) qc.setQueryData(detailKey, optimistic(previous, args));
        }
      : undefined,
    onError: optimistic
      ? () => {
          void qc.invalidateQueries({ queryKey: detailKey });
        }
      : undefined,
    onSuccess: (detail) => {
      qc.setQueryData(detailKey, detail);
      qc.invalidateQueries({ queryKey: listKey });
    },
  });
}
