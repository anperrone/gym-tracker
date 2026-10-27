import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { fetchMe, logout } from '@/lib/api';
import { clearOfflineCache } from '@/lib/query';

export const meQueryKey = ['me'] as const;

export function useAuth() {
  const { data, isPending, isFetching } = useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    staleTime: 60_000,
    // Riverifica sempre al mount (anche con cache fresca): copre il ritorno dal login e
    // un eventuale "non autenticato" già persistito da versioni precedenti.
    refetchOnMount: 'always',
    retry: false,
  });

  return {
    user: data ?? null,
    // Un "non autenticato" in cache non è definitivo finché il server non ha risposto:
    // la sessione potrebbe essere appena stata creata (es. ritorno dal login Google).
    isLoading: isPending || (!data && isFetching),
    isAuthenticated: Boolean(data),
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      // Isolamento dati: svuota la cache (anche persistita) per non lasciare dati al
      // prossimo utente su dispositivo condiviso.
      await clearOfflineCache();
      queryClient.setQueryData(meQueryKey, null);
      await navigate({ to: '/login' });
    },
  });
}
