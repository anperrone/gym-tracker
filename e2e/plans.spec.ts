import { expect, type Page, test } from '@playwright/test';

// Utente fresco per ogni test → schede isolate, nessun accumulo sul D1 locale.
async function login(page: Page): Promise<void> {
  const email = `e2e-plans-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

test('la nav "Schede" porta alla lista e permette di creare una scheda', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await page.getByRole('link', { name: /Schede/ }).click();
  await expect(page).toHaveURL(/\/plans$/);

  await page.getByLabel('Nome scheda').fill('Push / Pull / Legs');
  await page.getByRole('button', { name: 'Crea' }).click();
  await expect(page.getByText('Push / Pull / Legs')).toBeVisible();
});

test('costruisce una scheda: giorno + esercizio dal catalogo con target, persistito', async ({
  page,
}) => {
  await login(page);
  await page.goto('/plans');

  // Crea e apri la scheda.
  const planName = `Scheda ${Date.now()}`;
  await page.getByLabel('Nome scheda').fill(planName);
  await page.getByRole('button', { name: 'Crea' }).click();
  await page.getByRole('link', { name: new RegExp(planName) }).click();
  await expect(page.getByRole('heading', { name: planName })).toBeVisible();

  // Aggiungi un giorno.
  await page.getByLabel('Nome del giorno').fill('Giorno A');
  await page.getByRole('button', { name: 'Aggiungi giorno' }).click();
  await expect(page.getByRole('heading', { name: 'Giorno A' })).toBeVisible();

  // Aggiungi un esercizio dal catalogo.
  await page.getByRole('button', { name: 'Aggiungi esercizio' }).click();
  await page.getByLabel('Cerca esercizio').fill('leg press');
  await page.getByRole('button', { name: /Leg Press/ }).click();
  await expect(page.getByText('Leg Press', { exact: true })).toBeVisible();

  // Imposta i target serie/reps (persistiti su blur).
  await page.getByLabel('Serie').fill('4');
  await page.getByLabel('Serie').blur();
  await page.getByLabel('Reps').fill('8-12');
  const patched = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && /\/exercises\//.test(r.url()),
  );
  await page.getByLabel('Reps').blur();
  await patched;

  // Ricarica: i dati sono persistiti sul server.
  await page.reload();
  await expect(page.getByText('Leg Press', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Serie')).toHaveValue('4');
  await expect(page.getByLabel('Reps')).toHaveValue('8-12');
});
