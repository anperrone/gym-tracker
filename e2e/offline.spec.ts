import { expect, type Page, test } from '@playwright/test';

async function login(page: Page): Promise<void> {
  const email = `e2e-off-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

test('il manifest PWA è servito ed è installabile', async ({ page }) => {
  await login(page);
  const res = await page.request.get('/manifest.webmanifest');
  expect(res.ok()).toBeTruthy();
  const manifest = (await res.json()) as { name: string; display: string };
  expect(manifest.name).toBe('Gym Tracker');
  expect(manifest.display).toBe('standalone');
});

test('logging offline: optimistic immediato e sync senza duplicati al ritorno online', async ({
  page,
  context,
}) => {
  await login(page);
  await page.goto('/workout');
  await page.getByRole('button', { name: 'Avvia allenamento libero' }).click();
  await expect(page).toHaveURL(/\/workout\/[0-9a-f-]+$/);

  // Aggiungi un esercizio e una prima serie (online).
  await page.getByRole('button', { name: '+ Aggiungi esercizio' }).click();
  await page.getByLabel('Cerca esercizio').fill('leg press');
  await page.getByRole('button', { name: /Leg Press/ }).click();
  await page.getByRole('button', { name: 'Aggiungi serie' }).click();
  await expect(page.getByLabel('Peso serie 1')).toBeVisible();
  await page.waitForLoadState('networkidle');

  const sessionId = page.url().split('/workout/')[1];

  // === Ciclo 1: aggiorna il peso offline → sincronizza al ritorno online ===
  await context.setOffline(true);
  const weight1 = page.getByLabel('Peso serie 1');
  await weight1.fill('100');
  await expect(weight1).toHaveValue('100'); // attende che lo stato React rifletta il valore
  {
    const patched = page.waitForResponse(
      (r) => /\/sets\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH',
    );
    await weight1.blur();
    await context.setOffline(false);
    await patched;
  }
  await page.waitForLoadState('networkidle');

  // === Ciclo 2: aggiungi una serie offline (optimistic immediato) → sincronizza ===
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Aggiungi serie' }).click();
  // L'optimistic update mostra subito la nuova serie, anche offline.
  await expect(page.getByLabel('Peso serie 2')).toBeVisible({ timeout: 10_000 });
  {
    const posted = page.waitForResponse(
      (r) => /\/sets$/.test(r.url()) && r.request().method() === 'POST',
    );
    await context.setOffline(false);
    await posted;
  }

  // Verifica diretta sul server: 2 serie, peso 100 sulla prima, nessun duplicato.
  const res = await page.request.get(`/api/sessions/${sessionId}`);
  expect(res.ok()).toBeTruthy();
  const detail = (await res.json()) as {
    exercises: { sets: { weight: number | null }[] }[];
  };
  const sets = detail.exercises[0].sets;
  expect(sets).toHaveLength(2);
  expect(sets.some((s) => s.weight === 100)).toBe(true);
});
