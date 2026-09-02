import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ChartIcon, ClipboardIcon, DumbbellIcon, ListIcon, RulerIcon, ShieldIcon } from './icons';
import { ThemeToggle } from './ThemeToggle';

type IconComponent = (props: { className?: string }) => ReactNode;
type NavItem = { key: string; label: string; Icon: IconComponent; to?: string };

const NAV_ITEMS: NavItem[] = [
  { key: 'measurements', label: 'Misure', Icon: RulerIcon, to: '/measurements' },
  { key: 'exercises', label: 'Esercizi', Icon: ListIcon, to: '/exercises' },
  { key: 'plans', label: 'Schede', Icon: ClipboardIcon, to: '/plans' },
  { key: 'workout', label: 'Allena', Icon: DumbbellIcon, to: '/workout' },
  { key: 'progress', label: 'Progressi', Icon: ChartIcon, to: '/progress' },
];

// Voce riservata all'admin (aggiunta solo quando isAdmin).
const ADMIN_NAV_ITEM: NavItem = { key: 'admin', label: 'Admin', Icon: ShieldIcon, to: '/admin' };

const itemBase = 'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs';

export function AppShell({
  children,
  headerRight,
  isAdmin = false,
}: {
  children: ReactNode;
  headerRight?: ReactNode;
  isAdmin?: boolean;
}) {
  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;
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
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        className="fixed inset-x-0 bottom-0 z-10 grid border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        {navItems.map(({ key, label, Icon, to }) =>
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
