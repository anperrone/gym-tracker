import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { fetchMe, logout } from "@/lib/api";

export const meQueryKey = ["me"] as const;

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
      queryClient.setQueryData(meQueryKey, null);
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      await navigate({ to: "/login" });
    },
  });
}
