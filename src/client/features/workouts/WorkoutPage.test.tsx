import type { WorkoutSessionSummaryDto } from '@shared/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkoutPage } from '@/routes/workout';

function mockApi(sessions: WorkoutSessionSummaryDto[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      // /api/plans → nessuna scheda; /api/sessions → le sessioni.
      const body = url.includes('/api/plans') ? [] : sessions;
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: WorkoutPage });
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

afterEach(() => vi.unstubAllGlobals());

describe('<WorkoutPage />', () => {
  it('mostra il pulsante di avvio e lo storico con conteggi', async () => {
    mockApi([
      {
        id: 's1',
        status: 'completed',
        performedAt: '2026-02-01T10:00:00.000Z',
        planDayId: null,
        exerciseCount: 2,
        setCount: 3,
      },
    ]);
    renderPage();

    expect(await screen.findByText(/2 esercizi/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avvia allenamento libero' })).toBeInTheDocument();
    expect(screen.getByText(/3 serie/)).toBeInTheDocument();
  });

  it('mostra la sezione "In corso" per le sessioni in_progress', async () => {
    mockApi([
      {
        id: 's2',
        status: 'in_progress',
        performedAt: '2026-02-02T10:00:00.000Z',
        planDayId: null,
        exerciseCount: 1,
        setCount: 0,
      },
    ]);
    renderPage();

    expect(await screen.findByRole('list', { name: 'Sessioni in corso' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Riprendi' })).toBeInTheDocument();
  });
});
