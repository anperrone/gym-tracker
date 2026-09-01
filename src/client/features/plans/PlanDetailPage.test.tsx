import type { PlanDetailDto } from '@shared/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanDetailPage } from './PlanDetailPage';

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <PlanDetailPage planId="p1" /> });
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

const detail: PlanDetailDto = {
  id: 'p1',
  name: 'Full Body',
  description: null,
  isActive: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  days: [
    {
      id: 'd1',
      name: 'Giorno A',
      sortOrder: 0,
      exercises: [
        {
          id: 'pe1',
          exerciseId: 'ex_squat',
          exerciseName: 'Squat',
          equipment: 'barbell',
          sortOrder: 0,
          targetSets: 4,
          targetReps: '8-12',
          targetWeight: null,
          restSeconds: null,
          notes: null,
        },
      ],
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe('<PlanDetailPage />', () => {
  it('mostra i giorni e gli esercizi pianificati con i target', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(detail), { status: 200 })),
    );
    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Full Body' })).toBeInTheDocument();
    expect(screen.getByText('Giorno A')).toBeInTheDocument();
    expect(screen.getByText('Squat')).toBeInTheDocument();
    // Target serie/reps popolati negli input.
    expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    expect(screen.getByDisplayValue('8-12')).toBeInTheDocument();
  });
});
