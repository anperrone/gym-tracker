import { expect, type Page, test } from '@playwright/test';

function uniqueEmail(prefix: string): string {
  return `e2e-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

/** Login E2E via seam dev. `admin` forza il ruolo admin (query `admin=1`). */
async function login(page: Page, opts: { admin?: boolean } = {}): Promise<string> {
  const email = uniqueEmail(opts.admin ? 'admin' : 'user');
  const suffix = opts.admin ? '&admin=1' : '';
  const res = await page.request.post(
    `/auth/test-login?email=${encodeURIComponent(email)}${suffix}`,
  );
  expect(res.ok()).toBeTruthy();
  return email;
}

test('admin: aggiunge un esercizio globale e cambia il ruolo di un utente', async ({
  page,
  request,
}) => {
  // Un utente standard "bersaglio" esiste già (creato con un cookie jar separato).
  const targetEmail = uniqueEmail('target');
  const created = await request.post(`/auth/test-login?email=${encodeURIComponent(targetEmail)}`);
  expect(created.ok()).toBeTruthy();

  await login(page, { admin: true });
  await page.goto('/');

  // La voce nav "Admin" è visibile e porta al pannello.
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Aggiunge un esercizio al catalogo globale.
  const exerciseName = `E2E Globale ${Date.now()}`;
  await page.getByLabel('Nome esercizio').fill(exerciseName);
  await page.getByRole('button', { name: 'Aggiungi' }).click();
  await expect(page.getByText(exerciseName, { exact: true })).toBeVisible();

  // Cambia il ruolo dell'utente bersaglio: user → admin.
  const row = page.locator('li').filter({ hasText: targetEmail });
  await expect(row.getByText('user', { exact: true })).toBeVisible();
  await row.getByRole('button', { name: 'Rendi admin' }).click();
  await expect(row.getByText('admin', { exact: true })).toBeVisible();
});

test('utente standard: nessuna voce Admin e 403 sulle API admin', async ({ page }) => {
  await login(page);
  await page.goto('/');

  // La voce nav "Admin" non esiste per gli utenti standard.
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

  // Le API admin rispondono 403 (role-gated lato server).
  const res = await page.request.get('/api/admin/users');
  expect(res.status()).toBe(403);
});
