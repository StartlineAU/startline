import { test } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";

test.describe("about page", () => {
  test("about page visual snapshot", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("networkidle");
    await argosScreenshot(page, "about-page");
  });
});
