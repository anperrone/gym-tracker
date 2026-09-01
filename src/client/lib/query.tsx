import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { ReactNode } from 'react';
import { createIdbPersister } from './idbPersister';

const WEEK = 1000 * 60 * 60 * 24 * 7;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // La cache resta a lungo così le letture funzionano offline dopo un reload.
      gcTime: WEEK,
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createIdbPersister();

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: WEEK,
        // Persisti anche le mutation in pausa (coda offline), oltre alle query.
        dehydrateOptions: { shouldDehydrateMutation: () => true },
      }}
      onSuccess={() => {
        // Al ripristino della cache, riprendi le mutation messe in coda offline.
        void queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
