import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ChartIcon, ClipboardIcon, DumbbellIcon, ListIcon, RulerIcon } from './icons';
import { ThemeToggle } from './ThemeToggle';

type IconComponent = (props: { className?: string }) => ReactNode;
type NavItem = { key: string; label: string; Icon: IconComponent; to?: string };

const NAV_ITEMS: NavItem[] = [
  { key: 'measurements', label: 'Misure', Icon: RulerIcon, to: '/measurements' },
  { key: 'exercises', label: 'Esercizi', Icon: ListIcon, to: '/exercises' },
  { key: 'plans', label: 'Schede', Icon: ClipboardIcon, to: '/plans' },
  { key: 'workout', label: 'Allena', Icon: DumbbellIcon, to: '/workout' },
  { key: 'progress', label: 'Progressi', Icon: ChartIcon },
];

const itemBase = 'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs';

export function AppShell({
  children,
  headerRight,
}: {
  children: ReactNode;
  headerRight?: ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-bg text-text">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight">Gym Tracker</h1>
        <div className="flex items-center gap-2">
          {headerRight}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      <nav
        aria-label="Navigazione principale"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        {NAV_ITEMS.map(({ key, label, Icon, to }) =>
          to ? (
            <Link
              key={key}
              to={to}
              className={`${itemBase} text-text-muted`}
              activeProps={{ className: `${itemBase} text-accent` }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ) : (
            <button
              key={key}
              type="button"
              disabled
              className={`${itemBase} text-text-muted opacity-40`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ),
        )}
      </nav>
    </div>
  );
}
