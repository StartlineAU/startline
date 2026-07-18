import { test } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";
import { goToHomepage } from "./helpers";

test.describe("about page", () => {
  test("about page visual snapshot", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("networkidle");
    await argosScreenshot(page, "about-page");
  });
});

test.describe("email previews", () => {
  test("registration confirmation email visual snapshot", async ({ page }) => {
    await page.goto("/dev/email-previews");
    await page.waitForLoadState("networkidle");
    await argosScreenshot(page, "email-registration-confirmation");
  });
});
