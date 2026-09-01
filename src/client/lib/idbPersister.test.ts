import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// idb-keyval mockato in memoria (jsdom non ha IndexedDB).
vi.mock('idb-keyval', () => {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (k: string) => store.get(k)),
    set: vi.fn(async (k: string, v: unknown) => {
      store.set(k, v);
    }),
    del: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    __store: store,
  };
});

import { createIdbPersister } from './idbPersister';

const sample: PersistedClient = {
  timestamp: 123,
  buster: '',
  clientState: { mutations: [], queries: [] },
};

describe('idbPersister', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persiste, ripristina e rimuove il client', async () => {
    const persister = createIdbPersister('test-key');

    expect(await persister.restoreClient()).toBeUndefined();

    await persister.persistClient(sample);
    expect(await persister.restoreClient()).toEqual(sample);

    await persister.removeClient();
    expect(await persister.restoreClient()).toBeUndefined();
  });
});
