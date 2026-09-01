export function LoginPage() {
  return (
    <main className="min-h-dvh grid place-items-center bg-slate-50 px-6 text-slate-900">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold tracking-tight">Gym Tracker</h1>
        <p className="mt-2 text-sm text-slate-500">
          Accedi per tracciare misure corporee e allenamenti.
        </p>
        {/* Navigazione full-page verso la rotta server che avvia l'OAuth. */}
        <a
          href="/auth/google/login"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-slate-900 px-4 font-medium text-white"
        >
          Accedi con Google
        </a>
      </div>
    </main>
  );
}
