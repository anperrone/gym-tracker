import { expect, type Page, test } from '@playwright/test';

async function login(page: Page): Promise<void> {
  const email = `e2e-nf-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

test('una rotta client sconosciuta mostra la pagina not-found', async ({ page }) => {
  await login(page);
  await page.goto('/rotta-inesistente-xyz');

  await expect(page.getByRole('heading', { name: 'Pagina non trovata' })).toBeVisible();

  // Il link riporta alla home.
  await page.getByRole('link', { name: 'Torna alla home' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('API sconosciuta risponde 404 JSON', async ({ page }) => {
  const res = await page.request.get('/api/non-esiste');
  expect(res.status()).toBe(404);
  expect(await res.json()).toEqual({ error: 'Not found' });
});
