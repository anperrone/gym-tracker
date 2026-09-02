import type { AdminUserDto, ExerciseDto, MeResponse } from '@shared/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from './AdminPage';

const adminMe: MeResponse = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin',
  avatarUrl: null,
  role: 'admin',
};

function stubApi(exercises: ExerciseDto[], users: AdminUserDto[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/me')) return new Response(JSON.stringify(adminMe), { status: 200 });
      if (url.includes('/api/admin/exercises'))
        return new Response(JSON.stringify(exercises), { status: 200 });
      if (url.includes('/api/admin/users'))
        return new Response(JSON.stringify(users), { status: 200 });
      return new Response('null', { status: 404 });
    }),
  );
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: AdminPage });
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

const panca: ExerciseDto = {
  id: 'ex_panca',
  name: 'Panca Piana',
  muscleGroup: 'Petto',
  equipment: 'barbell',
  isCustom: false,
  canonicalExerciseId: null,
};

const users: AdminUserDto[] = [
  {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-1',
    email: 'mario@example.com',
    name: 'Mario',
    role: 'user',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];

afterEach(() => vi.unstubAllGlobals());

describe('<AdminPage />', () => {
  it('mostra catalogo globale, utenti e i controlli', async () => {
    stubApi([panca], users);
    renderPage();

    // Catalogo globale.
    expect(await screen.findByText('Panca Piana')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome esercizio')).toBeInTheDocument();

    // Utenti.
    expect(screen.getByText('mario@example.com')).toBeInTheDocument();
    // Controllo per promuovere ad admin l'utente standard.
    expect(screen.getByRole('button', { name: /Rendi admin/i })).toBeInTheDocument();
  });

  it('mostra lo stato vuoto del catalogo', async () => {
    stubApi([], [users[0]]);
    renderPage();
    expect(await screen.findByText(/Nessun esercizio nel catalogo/i)).toBeInTheDocument();
  });
});
