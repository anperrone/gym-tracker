import type { ExerciseDto } from '@shared/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExerciseList } from './ExerciseList';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function mockExercises(rows: ExerciseDto[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const barbellSquat: ExerciseDto = {
  id: 'ex_squat',
  name: 'Squat',
  muscleGroup: 'Quadricipiti / Glutei',
  equipment: 'barbell',
  isCustom: false,
  canonicalExerciseId: null,
};
const customRow: ExerciseDto = {
  id: 'c1',
  name: 'Pulley presa stretta',
  muscleGroup: 'Dorsali',
  equipment: 'cable',
  isCustom: true,
  canonicalExerciseId: null,
};

describe('<ExerciseList />', () => {
  it('raggruppa per attrezzatura e marca i custom', async () => {
    mockExercises([barbellSquat, customRow]);
    render(<ExerciseList filters={{}} />, { wrapper: wrapper() });

    expect(await screen.findByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('Pulley presa stretta')).toBeInTheDocument();
    // Intestazioni di gruppo (con conteggio) e badge custom.
    expect(screen.getByRole('list', { name: 'Bilanciere' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Cavi' })).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('mostra lo stato vuoto', async () => {
    mockExercises([]);
    render(<ExerciseList filters={{}} />, { wrapper: wrapper() });
    expect(await screen.findByText('Nessun esercizio trovato.')).toBeInTheDocument();
  });
});
