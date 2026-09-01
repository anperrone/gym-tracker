import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { AuthenticatedLayout } from '@/features/auth/AuthenticatedLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { PlanDetailPage } from '@/features/plans/PlanDetailPage';
import { ExercisesPage } from './routes/exercises';
import { HomePage } from './routes/home';
import { MeasurementsPage } from './routes/measurements';
import { PlansPage } from './routes/plans';

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

const exercisesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/exercises',
  component: ExercisesPage,
});

const plansRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/plans',
  component: PlansPage,
});

const planDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/plans/$planId',
  component: function PlanDetailRoute() {
    const { planId } = planDetailRoute.useParams();
    return <PlanDetailPage planId={planId} />;
  },
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([
    indexRoute,
    measurementsRoute,
    exercisesRoute,
    plansRoute,
    planDetailRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
