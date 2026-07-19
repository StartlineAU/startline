import { test, expect } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";
import { goToHomepage } from "./helpers";

async function openSignInModal(page: import("@playwright/test").Page) {
  await goToHomepage(page);
  await page.getByRole("button", { name: "SIGN IN" }).click();
  await page.waitForSelector('[role="dialog"]');
}

test.describe("passkey sign-in UI", () => {
  test("passkey button visible on sign-in modal", async ({ page }) => {
    await openSignInModal(page);
    await expect(page.getByRole("button", { name: /sign in with passkey/i })).toBeVisible();
  });

  test("passkey button shows fingerprint icon + text", async ({ page }) => {
    await openSignInModal(page);
    const btn = page.getByRole("button", { name: /sign in with passkey/i });
    await expect(btn).toBeVisible();
    await expect(btn.locator("svg")).toBeVisible();
  });

  test("sign-in modal visual snapshot with passkey", async ({ page }) => {
    await openSignInModal(page);
    await page.waitForLoadState("networkidle");
    await argosScreenshot(page, "sign-in-modal-with-passkey");
  });

  test("passkey and email divider renders", async ({ page }) => {
    await openSignInModal(page);
    await expect(page.getByText("or", { exact: true })).toBeVisible();
  });
});

test.describe("admin login — MFA UI", () => {
  test("admin login page renders email + password fields", async ({ page }) => {
    await page.goto("/admin/login");
    await page.waitForLoadState("networkidle");
    await expect(page.getByPlaceholder(/admin@startlineau/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await argosScreenshot(page, "admin-login-with-mfa-ready");
  });
});

test.describe("security settings page", () => {
  test("redirects to home when unauthenticated", async ({ page }) => {
    await page.goto("/settings/security");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL("/settings/security");
  });
});
