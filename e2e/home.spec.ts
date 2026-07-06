import { expect, test } from "@playwright/test";

test("Spanish-first mobile landing page loads", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /registra cada serie/i })).toBeVisible();
  await expect(page.getByText("Inicio")).toBeVisible();
  await expect(page.getByText("kg")).toBeVisible();
});
