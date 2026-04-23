import { expect, test } from "@playwright/test";

test("dashboard, queue, and source health are visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Thermal Lead Tracker")).toBeVisible();
  await expect(page.getByText("Lead Queue")).toBeVisible();
  await page.goto("/sources");
  await expect(page.getByText("Sources & health")).toBeVisible();
});
