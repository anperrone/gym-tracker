import type { PlanSummaryDto } from '@shared/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlansPage } from '@/routes/plans';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: PlansPage });
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

const plans: PlanSummaryDto[] = [
  {
    id: 'p1',
    name: 'Push/Pull/Legs',
    description: null,
    isActive: true,
    dayCount: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

afterEach(() => vi.unstubAllGlobals());

describe('<PlansPage />', () => {
  it('elenca le schede con badge attiva e conteggio giorni', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(plans), { status: 200 })),
    );
    renderPage();

    expect(await screen.findByText('Push/Pull/Legs')).toBeInTheDocument();
    expect(screen.getByText('Attiva')).toBeInTheDocument();
    expect(screen.getByText('3 giorni')).toBeInTheDocument();
  });

  it('mostra lo stato vuoto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })),
    );
    renderPage();
    expect(await screen.findByText(/Nessuna scheda ancora/)).toBeInTheDocument();
  });
});
