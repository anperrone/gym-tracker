import { expect, type Page, test } from '@playwright/test';

async function login(page: Page): Promise<void> {
  const email = `e2e-wk-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

/** Compila peso/reps di una serie e attende la persistenza (PATCH). */
async function logSet(page: Page, n: number, weight: number, reps: number): Promise<void> {
  const weightInput = page.getByLabel(`Peso serie ${n}`);
  await weightInput.fill(String(weight));
  const p1 = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && /\/sets\//.test(r.url()),
  );
  await weightInput.blur();
  await p1;

  const repsInput = page.getByLabel(`Reps serie ${n}`);
  await repsInput.fill(String(reps));
  const p2 = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && /\/sets\//.test(r.url()),
  );
  await repsInput.blur();
  await p2;
}

test('la nav "Allena" avvia un allenamento libero', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await page.getByRole('link', { name: /Allena/ }).click();
  await expect(page).toHaveURL(/\/workout$/);

  await page.getByRole('button', { name: 'Avvia allenamento libero' }).click();
  await expect(page).toHaveURL(/\/workout\/[0-9a-f-]+$/);
  await expect(page.getByText('In corso')).toBeVisible();
});

test('registra serie a peso variabile (60×12, 70×10, 80×8), completa e persiste', async ({
  page,
}) => {
  await login(page);
  await page.goto('/workout');
  await page.getByRole('button', { name: 'Avvia allenamento libero' }).click();
  await expect(page).toHaveURL(/\/workout\/[0-9a-f-]+$/);

  // Aggiungi un esercizio dal catalogo.
  await page.getByRole('button', { name: '+ Aggiungi esercizio' }).click();
  await page.getByLabel('Cerca esercizio').fill('leg press');
  await page.getByRole('button', { name: /Leg Press/ }).click();
  await expect(page.getByText('Leg Press', { exact: true })).toBeVisible();

  // Tre serie a peso variabile.
  const addSet = page.getByRole('button', { name: 'Aggiungi serie' });
  await addSet.click();
  await logSet(page, 1, 60, 12);
  await addSet.click();
  await logSet(page, 2, 70, 10);
  await addSet.click();
  await logSet(page, 3, 80, 8);

  // Completa la sessione.
  await page.getByRole('button', { name: 'Completa', exact: true }).click();
  await expect(page.getByText('Completato')).toBeVisible();

  // Ricarica: dati persistiti.
  await page.reload();
  await expect(page.getByText('Leg Press', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Peso serie 1')).toHaveValue('60');
  await expect(page.getByLabel('Reps serie 1')).toHaveValue('12');
  await expect(page.getByLabel('Peso serie 2')).toHaveValue('70');
  await expect(page.getByLabel('Peso serie 3')).toHaveValue('80');
  await expect(page.getByLabel('Reps serie 3')).toHaveValue('8');
});
