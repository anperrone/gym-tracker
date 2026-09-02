import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// Seam di test dev (/auth/test-login): crea una sessione senza passare da Google.
async function login(page: Page, email = 'a11y@example.com') {
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

/** Analisi axe su WCAG 2.x A/AA della pagina corrente. */
function audit(page: Page) {
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
}

test('la pagina di login non ha violazioni axe (A/AA)', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('link', { name: /Accedi con Google/i })).toBeVisible();
  const results = await audit(page);
  expect(results.violations).toEqual([]);
});

test('le pagine autenticate principali non hanno violazioni axe (A/AA)', async ({ page }) => {
  await login(page);
  for (const path of ['/', '/measurements', '/exercises', '/plans', '/workout', '/progress']) {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'Navigazione principale' })).toBeVisible();
    const results = await audit(page);
    expect(results.violations, `violazioni su ${path}`).toEqual([]);
  }
});

test('lo skip link è il primo focus da tastiera e porta al contenuto', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Navigazione principale' })).toBeVisible();

  // Lo skip link deve essere il primo elemento focalizzabile del documento.
  const firstFocusable = await page.evaluate(() => {
    const focusables = document.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
    );
    return focusables[0]?.getAttribute('href');
  });
  expect(firstFocusable).toBe('#main-content');

  // Ricevuto il focus, lo skip link diventa visibile (sr-only → focus:not-sr-only).
  const skip = page.getByRole('link', { name: /salta al contenuto/i });
  await skip.focus();
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  // Attivandolo, il focus passa al <main>.
  await page.keyboard.press('Enter');
  const focusedId = await page.evaluate(() => document.activeElement?.id);
  expect(focusedId).toBe('main-content');
});
