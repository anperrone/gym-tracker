import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, // sistema = light
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

describe('<ThemeToggle />', () => {
  it('espone un pulsante accessibile e commuta il tema', () => {
    render(<ThemeToggle />);

    const btn = screen.getByRole('button', { name: 'Passa al tema scuro' });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    // l'etichetta ora riflette l'azione opposta
    expect(screen.getByRole('button', { name: 'Passa al tema chiaro' })).toBeInTheDocument();
  });
});
