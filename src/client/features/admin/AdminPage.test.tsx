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

type StubOptions = {
  me?: MeResponse;
  exercises?: ExerciseDto[];
  users?: AdminUserDto[];
  exercisesStatus?: number;
};

function stubApi(opts: StubOptions = {}) {
  const me = opts.me ?? adminMe;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/me')) return new Response(JSON.stringify(me), { status: 200 });
    if (url.includes('/api/admin/exercises'))
      return new Response(JSON.stringify(opts.exercises ?? []), {
        status: opts.exercisesStatus ?? 200,
      });
    if (url.includes('/api/admin/users'))
      return new Response(JSON.stringify(opts.users ?? []), { status: 200 });
    return new Response('null', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
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
    stubApi({ exercises: [panca], users });
    renderPage();

    // Catalogo globale.
    expect(await screen.findByText('Panca Piana')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome esercizio')).toBeInTheDocument();
    expect(screen.getByLabelText('Gruppo muscolare')).toBeInTheDocument();

    // Utenti.
    expect(screen.getByText('mario@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rendi admin/i })).toBeInTheDocument();
  });

  it('mostra lo stato vuoto del catalogo', async () => {
    stubApi({ exercises: [], users: [users[0]] });
    renderPage();
    expect(await screen.findByText(/Nessun esercizio nel catalogo/i)).toBeInTheDocument();
  });

  it('mostra un errore (non lo stato vuoto) quando la query fallisce', async () => {
    stubApi({ exercisesStatus: 500, users: [users[0]] });
    renderPage();
    expect(await screen.findByText(/Impossibile caricare il catalogo/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nessun esercizio nel catalogo/i)).not.toBeInTheDocument();
  });

  it('non chiama le API admin per un utente non-admin', async () => {
    const fetchMock = stubApi({ me: { ...adminMe, role: 'user' } });
    renderPage();
    expect(await screen.findByText(/Accesso riservato/i)).toBeInTheDocument();
    const called = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(called.some((u) => u.includes('/api/admin'))).toBe(false);
  });
});
