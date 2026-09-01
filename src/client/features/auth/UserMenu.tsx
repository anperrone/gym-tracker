import { useAuth, useLogout } from "./useAuth";

export function UserMenu() {
  const { user } = useAuth();
  const logout = useLogout();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[45vw] truncate text-sm text-slate-600">
        {user.name ?? user.email}
      </span>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
      >
        Esci
      </button>
    </div>
  );
}
