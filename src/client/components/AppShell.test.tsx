import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

// AppShell usa <Link>: va reso dentro un RouterProvider.
function renderInRouter(node: ReactNode) {
  const rootRoute = createRootRoute({ component: () => node });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('<AppShell />', () => {
  it("mostra il titolo dell'app e i contenuti", async () => {
    renderInRouter(<AppShell>contenuto di prova</AppShell>);
    expect(await screen.findByText('contenuto di prova')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gym Tracker' })).toBeInTheDocument();
  });

  it('espone la navigazione principale', async () => {
    renderInRouter(<AppShell>x</AppShell>);
    expect(
      await screen.findByRole('navigation', { name: 'Navigazione principale' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Misure')).toBeInTheDocument();
  });

  it('espone il toggle del tema', async () => {
    renderInRouter(<AppShell>x</AppShell>);
    expect(await screen.findByRole('button', { name: /tema/i })).toBeInTheDocument();
  });

  it('nasconde la voce Admin agli utenti standard', async () => {
    renderInRouter(<AppShell>x</AppShell>);
    await screen.findByText('Misure');
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('mostra la voce Admin agli amministratori', async () => {
    renderInRouter(<AppShell isAdmin>x</AppShell>);
    expect(await screen.findByText('Admin')).toBeInTheDocument();
  });
});
