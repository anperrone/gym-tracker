import type { ExerciseDto } from '@shared/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExercisePicker } from './ExercisePicker';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const rows: ExerciseDto[] = [
  {
    id: 'ex_squat',
    name: 'Squat',
    muscleGroup: 'Quadricipiti / Glutei',
    equipment: 'barbell',
    isCustom: false,
    canonicalExerciseId: null,
  },
  {
    id: 'c1',
    name: 'Squat mio',
    muscleGroup: null,
    equipment: 'barbell',
    isCustom: true,
    canonicalExerciseId: null,
  },
];

afterEach(() => vi.unstubAllGlobals());

describe('<ExercisePicker />', () => {
  it('seleziona una voce e applica il filtro (solo globali)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 })),
    );
    const onSelect = vi.fn();
    render(<ExercisePicker onSelect={onSelect} filter={(e) => !e.isCustom} />, {
      wrapper: wrapper(),
    });

    const option = await screen.findByRole('button', { name: /Squat/ });
    // Il custom è filtrato via: compare solo la voce globale.
    expect(screen.queryByText('Squat mio')).not.toBeInTheDocument();

    await userEvent.click(option);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'ex_squat' }));
  });
});
