import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page, email = 'e2e-measures@example.com') {
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

test('aggiunge una misurazione e la vede nello storico', async ({ page }) => {
  await login(page);
  await page.goto('/measurements');

  await expect(page.getByRole('heading', { name: 'Nuova misurazione' })).toBeVisible();
  await page.getByLabel(/^Peso/).fill('66.9');
  await page.getByRole('button', { name: /Salva misurazione/ }).click();

  // Compare nello storico (scoped alla lista: il valore appare anche nell'asse del grafico)
  const storico = page.getByRole('list', { name: 'Storico misurazioni' });
  await expect(storico.getByText('66.9')).toBeVisible();
});

test('la nav "Misure" porta alla pagina misure', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await page.getByRole('link', { name: /Misure/ }).click();
  await expect(page).toHaveURL(/\/measurements$/);
});
