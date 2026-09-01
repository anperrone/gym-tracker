import { randomUUID } from 'node:crypto';
import { expect, type Page, test } from '@playwright/test';

async function login(page: Page): Promise<void> {
  const email = `e2e-prog-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

/** Registra via API una sessione con un esercizio e alcune serie. */
async function seedWorkout(page: Page): Promise<void> {
  const start = await page.request.post('/api/sessions', { data: { clientId: randomUUID() } });
  const session = (await start.json()) as { id: string };
  const added = await page.request.post(`/api/sessions/${session.id}/exercises`, {
    data: { exerciseId: 'ex_squat' },
  });
  const detail = (await added.json()) as { exercises: { id: string }[] };
  const seId = detail.exercises[0].id;
  for (const [weight, reps] of [
    [80, 8],
    [90, 5],
  ]) {
    const res = await page.request.post(`/api/sessions/${session.id}/exercises/${seId}/sets`, {
      data: { weight, reps },
    });
    expect(res.ok()).toBeTruthy();
  }
}

test('la nav "Progressi" porta alla pagina progressi', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await page.getByRole('link', { name: /Progressi/ }).click();
  await expect(page).toHaveURL(/\/progress$/);
});

test('i progressi mostrano l’esercizio loggato e il grafico', async ({ page }) => {
  await login(page);
  await seedWorkout(page);

  await page.goto('/progress');
  // I controlli compaiono quando ci sono dati loggati; l'esercizio è selezionato di default.
  await expect(page.getByRole('button', { name: 'Peso max' })).toBeVisible();
  await expect(page.getByLabel('Esercizio')).toHaveValue('ex_squat');
  // Il grafico di progressione (Recharts) è renderizzato.
  await expect(page.locator('.recharts-wrapper').first()).toBeVisible({ timeout: 15_000 });
});
