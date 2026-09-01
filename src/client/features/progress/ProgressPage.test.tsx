import type { ProgressExerciseDto } from '@shared/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProgressPage } from '@/routes/progress';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function mockApi(exercises: ProgressExerciseDto[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/progress/exercises/')) {
        return new Response(JSON.stringify([]), { status: 200 }); // punti serie
      }
      if (url.includes('/api/progress/exercises')) {
        return new Response(JSON.stringify(exercises), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 }); // misure/series
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

const squat: ProgressExerciseDto = {
  exerciseId: 'ex_squat',
  exerciseName: 'Squat',
  sessionCount: 3,
  bestWeight: 100,
  best1RM: 116.7,
  lastPerformedAt: '2026-02-01T10:00:00.000Z',
};

describe('<ProgressPage />', () => {
  it('mostra selettore esercizio e toggle metrica', async () => {
    mockApi([squat]);
    render(<ProgressPage />, { wrapper: wrapper() });

    expect(await screen.findByRole('option', { name: 'Squat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Peso max' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1RM stimato' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volume' })).toBeInTheDocument();
    // Sezione peso corporeo presente.
    expect(screen.getByRole('heading', { name: 'Peso corporeo' })).toBeInTheDocument();
  });

  it('mostra lo stato vuoto senza allenamenti loggati', async () => {
    mockApi([]);
    render(<ProgressPage />, { wrapper: wrapper() });
    expect(await screen.findByText(/Registra un allenamento/)).toBeInTheDocument();
  });
});
