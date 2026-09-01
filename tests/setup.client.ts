import '@testing-library/jest-dom/vitest';

// jsdom (con origin opaco) non espone `localStorage`: polyfill in-memory per i test client.
// In un browser reale `localStorage` è nativo; questo serve solo all'ambiente di test.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  const memoryStorage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem: (key: string) => (store.has(key) ? (store.get(key) ?? null) : null),
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  } as Storage;

  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
  });
  Object.defineProperty(window, 'localStorage', {
    value: memoryStorage,
    configurable: true,
  });
}
