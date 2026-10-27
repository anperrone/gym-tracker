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

// Regressione: il "non autenticato" in cache (persistito al logout) non deve rimandare al
// login quando, al ritorno dal callback OAuth, la sessione è già valida.
test('dopo il logout un nuovo login porta nell’app', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Esci/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  // Lascia al persister il tempo di salvare la cache su IndexedDB (throttle 1s).
  await page.waitForTimeout(1500);

  // Equivalente del callback OAuth: sessione creata lato server, poi redirect a '/'.
  await login(page);
  await page.goto('/');

  await expect(page.getByRole('navigation', { name: 'Navigazione principale' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login$/);
});

test('la pagina di login con sessione valida porta nell’app', async ({ page }) => {
  await login(page);
  await page.goto('/login');

  await expect(page.getByRole('navigation', { name: 'Navigazione principale' })).toBeVisible();
});
