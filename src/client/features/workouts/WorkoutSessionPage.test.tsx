import type { WorkoutSessionDetailDto } from '@shared/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkoutSessionPage } from './WorkoutSessionPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <WorkoutSessionPage sessionId="s1" /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const detail: WorkoutSessionDetailDto = {
  id: 's1',
  planDayId: null,
  status: 'in_progress',
  performedAt: '2026-02-01T10:00:00.000Z',
  durationSeconds: null,
  notes: null,
  exercises: [
    {
      id: 'se1',
      exerciseId: 'ex_squat',
      exerciseName: 'Squat',
      equipment: 'barbell',
      sortOrder: 0,
      sets: [
        { id: 'set1', setNumber: 1, weight: 60, reps: 12, notes: null, completed: false },
        { id: 'set2', setNumber: 2, weight: 70, reps: 10, notes: null, completed: true },
      ],
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe('<WorkoutSessionPage />', () => {
  it('mostra esercizi, serie a peso variabile e il pulsante Completa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(detail), { status: 200 })),
    );
    renderPage();

    expect(await screen.findByText('Squat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completa' })).toBeInTheDocument();
    // Serie a peso variabile popolate.
    expect(screen.getByLabelText('Peso serie 1')).toHaveValue(60);
    expect(screen.getByLabelText('Reps serie 1')).toHaveValue(12);
    expect(screen.getByLabelText('Peso serie 2')).toHaveValue(70);
  });
});
