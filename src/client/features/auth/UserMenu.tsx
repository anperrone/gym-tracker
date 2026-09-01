import { useAuth, useLogout } from './useAuth';

export function UserMenu() {
  const { user } = useAuth();
  const logout = useLogout();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[40vw] truncate text-sm text-text-muted">
        {user.name ?? user.email}
      </span>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface-2 disabled:opacity-50"
      >
        Esci
      </button>
    </div>
  );
}
