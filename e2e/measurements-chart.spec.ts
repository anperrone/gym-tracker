import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page, email: string) {
  const res = await page.request.post(`/auth/test-login?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBeTruthy();
}

// Regressione del bug "asse Y tagliato": le etichette dei tick Y devono essere
// completamente dentro il box del grafico (nessun clipping a sinistra), su più viewport.
// In Recharts v3 le tick-label sono in un layer separato (.recharts-yAxis-tick-labels).
const Y_TICKS = '.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value';

test('il grafico mostra le etichette dell’asse Y senza tagli', async ({ page }) => {
  await login(page, 'e2e-chart@example.com');
  await page.goto('/measurements');

  // Crea un dato (metrica Peso, selezionata di default) e attende il commit lato server.
  await page.getByLabel(/^Peso/).fill('72.4');
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith('/api/measurements') && r.request().method() === 'POST' && r.ok(),
    ),
    page.getByRole('button', { name: /Salva misurazione/ }).click(),
  ]);

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/measurements');

    const wrapper = page.locator('.recharts-wrapper');
    await expect(wrapper).toBeVisible();

    const yTicks = page.locator(Y_TICKS);
    await expect(yTicks.first()).toBeVisible({ timeout: 15_000 });

    const wbox = await wrapper.boundingBox();
    const count = await yTicks.count();
    expect(count, `tick asse Y a ${width}px`).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const box = await yTicks.nth(i).boundingBox();
      expect(box, `bounding box tick ${i} a ${width}px`).not.toBeNull();
      if (box && wbox) {
        // il tick inizia dentro il box del grafico (non tagliato a sinistra)
        expect(box.x, `tick ${i} a ${width}px non deve uscire a sinistra`).toBeGreaterThanOrEqual(
          wbox.x - 1,
        );
        // ...ed è effettivamente renderizzato (larghezza reale)
        expect(box.width).toBeGreaterThan(0);
      }
    }
  }
});
