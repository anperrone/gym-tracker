import { expect, type Page, test } from '@playwright/test';

// Utente fresco per ogni test: i custom creati restano isolati e non si accumulano tra run.
async function login(page: Page): Promise<void> {
  const email = `e2e-ex-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

test('la nav "Esercizi" porta al catalogo', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await page.getByRole('link', { name: /Esercizi/ }).click();
  await expect(page).toHaveURL(/\/exercises$/);
  // Il catalogo seed è visibile.
  await expect(page.getByText('Leg Press', { exact: true })).toBeVisible();
});

test('la ricerca filtra il catalogo', async ({ page }) => {
  await login(page);
  await page.goto('/exercises');

  await page.getByLabel('Cerca esercizio').fill('leg press');
  await expect(page.getByText('Leg Press', { exact: true })).toBeVisible();
  // Un esercizio non correlato scompare.
  await expect(page.getByText('Plank', { exact: true })).toHaveCount(0);
});

test('crea un esercizio custom a testo libero', async ({ page }) => {
  await login(page);
  await page.goto('/exercises');

  const name = `Custom E2E ${Date.now()}`;
  await page.getByLabel('Nome esercizio').fill(name);
  await page.getByRole('button', { name: /Aggiungi esercizio/ }).click();

  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await expect(page.getByText('Custom', { exact: true }).first()).toBeVisible();
});

test('collega un custom a una voce canonica del catalogo', async ({ page }) => {
  await login(page);
  await page.goto('/exercises');

  const name = `Da collegare ${Date.now()}`;
  await page.getByLabel('Nome esercizio').fill(name);
  await page.getByRole('button', { name: /Aggiungi esercizio/ }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  // Apre la modale di collegamento.
  await page.getByRole('button', { name: `Collega ${name}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Cerca e seleziona la voce canonica dal catalogo.
  await dialog.getByLabel('Cerca esercizio').fill('leg press');
  await dialog.getByRole('button', { name: /Leg Press/ }).click();

  // La modale si chiude e la riga mostra il collegamento.
  await expect(dialog).toBeHidden();
  await expect(page.getByText('→ Leg Press')).toBeVisible();
});
