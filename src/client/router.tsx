import { createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router';
import { ErrorState } from '@/components/ErrorState';
import { AuthenticatedLayout } from '@/features/auth/AuthenticatedLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { PlanDetailPage } from '@/features/plans/PlanDetailPage';
import { WorkoutSessionPage } from '@/features/workouts/WorkoutSessionPage';
import { AdminPage } from './routes/admin';
import { ExercisesPage } from './routes/exercises';
import { HomePage } from './routes/home';
import { MeasurementsPage } from './routes/measurements';
import { PlansPage } from './routes/plans';
import { ProgressPage } from './routes/progress';
import { WorkoutPage } from './routes/workout';

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

const workoutRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/workout',
  component: WorkoutPage,
});

const workoutSessionRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/workout/$sessionId',
  component: function WorkoutSessionRoute() {
    const { sessionId } = workoutSessionRoute.useParams();
    return <WorkoutSessionPage sessionId={sessionId} />;
  },
});

const progressRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/progress',
  component: ProgressPage,
});

const adminRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/admin',
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([
    indexRoute,
    measurementsRoute,
    exercisesRoute,
    plansRoute,
    planDetailRoute,
    workoutRoute,
    workoutSessionRoute,
    progressRoute,
    adminRoute,
  ]),
]);

const homeLinkClass =
  'rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90';

function NotFound() {
  return (
    <ErrorState
      title="Pagina non trovata"
      description="Il percorso richiesto non esiste o è stato spostato."
      action={
        <Link to="/" className={homeLinkClass}>
          Torna alla home
        </Link>
      }
    />
  );
}

function RouterError() {
  return (
    <ErrorState
      title="Qualcosa è andato storto"
      description="Si è verificato un errore imprevisto. Riprova o torna alla home."
      action={
        <Link to="/" className={homeLinkClass}>
          Torna alla home
        </Link>
      }
    />
  );
}

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound,
  defaultErrorComponent: RouterError,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
