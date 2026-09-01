import type { ReactNode } from "react";

const NAV_ITEMS = [
  { key: "measurements", label: "Misure", icon: "📏" },
  { key: "plans", label: "Schede", icon: "📋" },
  { key: "workout", label: "Allena", icon: "🏋️" },
  { key: "progress", label: "Progressi", icon: "📈" },
] as const;

export function AppShell({
  children,
  headerRight,
}: {
  children: ReactNode;
  headerRight?: ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight">Gym Tracker</h1>
        {headerRight}
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      <nav
        aria-label="Navigazione principale"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs text-slate-600"
          >
            <span aria-hidden="true" className="text-lg">
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
