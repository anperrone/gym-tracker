import { ThemeToggle } from '@/components/ThemeToggle';

export function LoginPage() {
  return (
    <main className="min-h-dvh bg-bg px-6 text-text">
      <div className="flex justify-end pt-4">
        <ThemeToggle />
      </div>
      <div className="grid min-h-[70dvh] place-items-center">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold tracking-tight">Gym Tracker</h1>
          <p className="mt-2 text-sm text-text-muted">
            Accedi per tracciare misure corporee e allenamenti.
          </p>
          {/* Navigazione full-page verso la rotta server che avvia l'OAuth. */}
          <a
            href="/auth/google/login"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 font-medium text-accent-fg transition-opacity hover:opacity-90"
          >
            Accedi con Google
          </a>
        </div>
      </div>
    </main>
  );
}
