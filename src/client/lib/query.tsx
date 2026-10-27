import { defaultShouldDehydrateQuery, type Query, QueryClient } from '@tanstack/react-query';
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

/**
 * `me` a null ("non autenticato") non va persistito: dopo il redirect dal login OAuth
 * verrebbe ripristinato e l'app rimanderebbe al login nonostante la sessione valida.
 * L'utente autenticato invece sì, per aprire l'app offline.
 */
function isLoggedOutMe(query: Query): boolean {
  return query.queryKey[0] === 'me' && query.state.data == null;
}

/**
 * Svuota la cache persistita (IndexedDB) e in memoria. Da chiamare al logout: su un
 * dispositivo condiviso l'utente successivo non deve vedere i dati del precedente.
 */
export async function clearOfflineCache(): Promise<void> {
  await persister.removeClient();
  queryClient.clear();
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: WEEK,
        // Persiste solo le query (letture offline). Le mutation NON vengono persistite:
        // dopo un reload non sarebbero rieseguibili senza mutationFn. La coda offline vive
        // in memoria e si sincronizza alla riconnessione mentre l'app è aperta.
        dehydrateOptions: {
          shouldDehydrateMutation: () => false,
          shouldDehydrateQuery: (query) =>
            defaultShouldDehydrateQuery(query) && !isLoggedOutMe(query),
        },
      }}
      onSuccess={() => {
        // Al ripristino, riprendi eventuali mutation in pausa ancora in memoria.
        void queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
