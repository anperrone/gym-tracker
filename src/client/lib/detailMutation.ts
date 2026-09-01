import { useMutation, useQueryClient } from '@tanstack/react-query';

type OptimisticContext<TDetail> = { previous: TDetail | undefined };

/**
 * Mutation che restituisce un DTO di dettaglio aggiornato: scrive la cache del dettaglio
 * e invalida la lista. Condivisa da schede e allenamenti (parametrizzata sulle query key).
 *
 * Con `optimistic`, applica subito l'aggiornamento alla cache (anche offline, quando la
 * mutation è in pausa) e fa rollback in caso di errore — usato per il logging offline.
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
      ? async (args: TArgs): Promise<OptimisticContext<TDetail>> => {
          await qc.cancelQueries({ queryKey: detailKey });
          const previous = qc.getQueryData<TDetail>(detailKey);
          if (previous !== undefined) qc.setQueryData(detailKey, optimistic(previous, args));
          return { previous };
        }
      : undefined,
    onError: optimistic
      ? (_err, _args, ctx) => {
          const previous = (ctx as OptimisticContext<TDetail> | undefined)?.previous;
          if (previous !== undefined) qc.setQueryData(detailKey, previous);
        }
      : undefined,
    onSuccess: (detail) => {
      qc.setQueryData(detailKey, detail);
      qc.invalidateQueries({ queryKey: listKey });
    },
  });
}
