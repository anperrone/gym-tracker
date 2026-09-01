import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

const DEFAULT_KEY = 'gt-query-cache';

/**
 * Persister del client TanStack Query su IndexedDB (via idb-keyval).
 * Conserva cache delle query e mutation in pausa per l'uso offline.
 */
export function createIdbPersister(idbKey: string = DEFAULT_KEY): Persister {
  return {
    persistClient: (client: PersistedClient) => set(idbKey, client),
    restoreClient: () => get<PersistedClient>(idbKey),
    removeClient: () => del(idbKey),
  };
}
