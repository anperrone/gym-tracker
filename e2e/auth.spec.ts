import { expect, test } from '@playwright/test';

// Usa il seam di test dev (/auth/test-login) per creare una sessione senza Google.
async function login(page: import('@playwright/test').Page, email = 'e2e@example.com') {
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

test("login mostra l'area autenticata con stato API online", async ({ page }) => {
  await login(page);
  await page.goto('/');

  await expect(page.getByRole('navigation', { name: 'Navigazione principale' })).toBeVisible();
  await expect(page.getByText('online')).toBeVisible();
});

test('logout riporta alla pagina di login', async ({ page }) => {
  await login(page);
  await page.goto('/');

  await page.getByRole('button', { name: /Esci/i }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('link', { name: /Accedi con Google/i })).toBeVisible();
});
