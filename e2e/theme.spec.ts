import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page, email: string) {
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

test('il toggle del tema cambia e persiste dopo il reload', async ({ page }) => {
  await login(page, 'e2e-theme@example.com');
  await page.goto('/');

  const html = page.locator('html');
  const initial = await html.getAttribute('data-theme');
  expect(initial === 'light' || initial === 'dark').toBeTruthy();

  await page.getByRole('button', { name: /tema/i }).click();

  const toggled = await html.getAttribute('data-theme');
  expect(toggled).not.toBe(initial);

  // La scelta persiste dopo un reload (localStorage + script anti-FOUC).
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', toggled ?? 'dark');
});
