import { useTheme } from '@/lib/theme';
import { MoonIcon, SunIcon } from './icons';

/** Pulsante per commutare tema chiaro/scuro. L'etichetta descrive l'azione (a11y). */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:text-text"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
