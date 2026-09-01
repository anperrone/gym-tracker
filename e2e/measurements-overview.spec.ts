import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page, email: string) {
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

async function seedWeight(
  page: import('@playwright/test').Page,
  measuredAt: string,
  value: number,
) {
  const res = await page.request.post('/api/measurements', {
    data: { measuredAt, values: [{ typeId: 'mt_weight', value }] },
  });
  expect(res.ok(), `seed ${measuredAt}`).toBeTruthy();
}

test('la sintesi mostra ultimo valore e delta vs misura precedente', async ({ page }) => {
  await login(page, 'e2e-overview@example.com');
  await seedWeight(page, '2025-01-01', 70);
  await seedWeight(page, '2025-02-01', 72.5);

  await page.goto('/measurements');

  // Valore più recente e delta (formato it-IT con virgola: appare solo nella StatTile).
  await expect(page.getByText('72,5')).toBeVisible();
  await expect(page.getByText('▲')).toBeVisible();
  await expect(page.getByText('2,5 kg')).toBeVisible();
});
