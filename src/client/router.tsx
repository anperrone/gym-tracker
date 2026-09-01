import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { AuthenticatedLayout } from '@/features/auth/AuthenticatedLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { HomePage } from './routes/home';
import { MeasurementsPage } from './routes/measurements';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

// Rotta pubblica di login.
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// Layout protetto: richiede autenticazione, avvolge la shell dell'app.
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  component: AuthenticatedLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: HomePage,
});

const measurementsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/measurements',
  component: MeasurementsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([indexRoute, measurementsRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
