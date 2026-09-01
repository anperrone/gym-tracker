import { describe, expect, it, vi } from 'vitest';

// idb-keyval mockato: verifichiamo che il logout rimuova la cache persistita.
vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { del } from 'idb-keyval';
import { clearOfflineCache, queryClient } from './query';

describe('clearOfflineCache (isolamento al logout)', () => {
  it('svuota la cache in memoria e quella persistita', async () => {
    queryClient.setQueryData(['session', 's1'], { secret: true });
    expect(queryClient.getQueryData(['session', 's1'])).toBeDefined();

    await clearOfflineCache();

    expect(queryClient.getQueryData(['session', 's1'])).toBeUndefined();
    expect(del).toHaveBeenCalledWith('gt-query-cache');
  });
});
