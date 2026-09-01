import { expect, test } from "@playwright/test";

test("la home carica e mostra lo stato API online", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Gym Tracker" })).toBeVisible();
  await expect(page.getByText(/Stato API:/)).toBeVisible();
  // La home interroga /api/health: al ritorno mostra "online".
  await expect(page.getByText("online")).toBeVisible();
});

test("espone la navigazione principale", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Navigazione principale" })).toBeVisible();
});
