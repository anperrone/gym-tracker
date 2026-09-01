import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** Chiave localStorage per la preferenza di tema dell'utente. */
export const THEME_STORAGE_KEY = 'gt-theme';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** Preferenza di tema del sistema operativo; difensivo se `matchMedia` non è disponibile. */
export function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Tema salvato dall'utente, o `null` se assente/non valido. */
export function getStoredTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    // localStorage non accessibile (es. modalità privata)
    return null;
  }
}

/** Tema iniziale: la scelta salvata ha precedenza sulla preferenza di sistema. */
export function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

/** Applica il tema al `<html>` (attributo `data-theme` + `color-scheme` nativo). */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

/** Hook di tema: stato corrente + toggle, con persistenza e sincronizzazione col DOM. */
export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (next: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(() => {
    const current = document.documentElement.dataset.theme;
    return isTheme(current) ? current : resolveInitialTheme();
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Segue il tema di sistema finché l'utente non ha una preferenza salvata.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (getStoredTheme() === null) setThemeState(e.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // storage non disponibile: il tema resta comunque applicato in memoria/DOM
    }
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // storage non disponibile
      }
      return next;
    });
  }, []);

  return { theme, toggle, setTheme };
}

/**
 * Osserva l'attributo `data-theme` sul `<html>` e ritorna il tema corrente. Serve ai
 * componenti che risolvono colori dai token via JS (es. i grafici Recharts, che ricevono
 * stringhe-colore literali) e devono ricalcolarli quando il tema cambia.
 */
export function useThemeAttribute(): Theme {
  const [theme, setTheme] = useState<Theme>(() => {
    const current = document.documentElement.dataset.theme;
    return isTheme(current) ? current : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const current = root.dataset.theme;
      setTheme(isTheme(current) ? current : 'light');
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
