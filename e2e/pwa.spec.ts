import { expect, type Page, test } from '@playwright/test';

// Seam di test dev (/auth/test-login): sessione senza passare da Google.
async function login(page: Page) {
  const email = `e2e-pwa-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

test('il manifest espone i requisiti minimi di installabilità', async ({ page }) => {
  const res = await page.request.get('/manifest.webmanifest');
  expect(res.ok()).toBeTruthy();
  const manifest = (await res.json()) as {
    name: string;
    display: string;
    start_url: string;
    icons: { sizes: string; type: string; purpose?: string }[];
  };
  expect(manifest.name).toBe('Gym Tracker');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/');
  // Icona scalabile e maskable → copre tutte le dimensioni su Android/iOS.
  const icon = manifest.icons[0];
  expect(icon.type).toBe('image/svg+xml');
  expect(icon.sizes).toBe('any');
  expect(icon.purpose).toContain('maskable');
});

test('la pagina collega il manifest e registra il service worker', async ({ page }) => {
  await login(page);
  await page.goto('/');

  // <link rel="manifest"> presente nella head.
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    /manifest\.webmanifest/,
  );

  // Il service worker si registra (registerSW immediate) → app installabile/offline-ready.
  await page.waitForFunction(
    async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return Boolean(reg);
    },
    null,
    { timeout: 20_000 },
  );
});
