import { expect, test } from "@playwright/test";

test("dashboard, permits, leads, and source health are visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Thermal Lead Tracker")).toBeVisible();
  await expect(page.getByText("Work next")).toBeVisible();
  await page.goto("/permits");
  await expect(page.getByText("Permits in the Cedar Rapids radius")).toBeVisible();
  await page.goto("/leads");
  await expect(page.getByText("Lead queue")).toBeVisible();
  await page.goto("/sources");
  await expect(page.getByText("Source health")).toBeVisible();
});
