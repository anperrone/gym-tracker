import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { fetchMe, logout } from '@/lib/api';
import { clearOfflineCache } from '@/lib/query';

export const meQueryKey = ['me'] as const;

export function useAuth() {
  const { data, isPending } = useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
  });

  return {
    user: data ?? null,
    isLoading: isPending,
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
