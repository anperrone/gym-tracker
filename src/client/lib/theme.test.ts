import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  useTheme,
} from './theme';

function mockMatchMedia(prefersDark: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark && query.includes('dark'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = '';
  mockMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getStoredTheme', () => {
  it('ritorna null se non c’è nulla in storage', () => {
    expect(getStoredTheme()).toBeNull();
  });

  it('ritorna il valore memorizzato se valido', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('ignora valori non validi', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'banana');
    expect(getStoredTheme()).toBeNull();
  });
});

describe('getSystemTheme', () => {
  it('rileva la preferenza scura dal sistema', () => {
    mockMatchMedia(true);
    expect(getSystemTheme()).toBe('dark');
  });

  it('è difensivo se matchMedia non esiste (fallback light)', () => {
    // @ts-expect-error: simula ambienti senza matchMedia
    window.matchMedia = undefined;
    expect(getSystemTheme()).toBe('light');
  });
});

describe('resolveInitialTheme', () => {
  it('lo storage ha precedenza sul sistema', () => {
    mockMatchMedia(true); // sistema = dark
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(resolveInitialTheme()).toBe('light');
  });

  it('senza storage usa il tema di sistema', () => {
    mockMatchMedia(true);
    expect(resolveInitialTheme()).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('imposta data-theme e color-scheme sul documento', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});

describe('useTheme', () => {
  it('inizializza dal tema risolto', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggle inverte tema, persiste e aggiorna il documento', () => {
    const { result } = renderHook(() => useTheme()); // parte da light (sistema)
    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
