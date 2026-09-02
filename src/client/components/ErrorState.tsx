import type { ReactNode } from 'react';

/** Stato di errore/vuoto a pagina intera, a tema. Riusato per not-found ed error boundary. */
export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold text-text">{title}</h1>
        {description && <p className="mt-2 text-sm text-text-muted">{description}</p>}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
