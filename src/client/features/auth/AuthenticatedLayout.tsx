import { Navigate, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { UserMenu } from "./UserMenu";
import { useAuth } from "./useAuth";

export function AuthenticatedLayout() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-dvh grid place-items-center bg-slate-50 text-slate-400">
        Caricamento…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <AppShell headerRight={<UserMenu />}>
      <Outlet />
    </AppShell>
  );
}
