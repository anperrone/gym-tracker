import { expect, test } from '@playwright/test';

test('un utente non autenticato viene rediretto al login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Gym Tracker' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Accedi con Google/i })).toBeVisible();
});
