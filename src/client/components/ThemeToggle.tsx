import { useTheme } from '@/lib/theme';
import { IconButton } from './IconButton';
import { MoonIcon, SunIcon } from './icons';

/** Pulsante per commutare tema chiaro/scuro. L'etichetta descrive l'azione (a11y). */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro';

  return (
    <IconButton label={label} onClick={toggle}>
      {isDark ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}
