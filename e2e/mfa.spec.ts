import { test, expect } from "@playwright/test";
import { goToHomepage } from "./helpers";

test.describe("MFA sign-in flow", () => {
  test("passkey button visible with correct icon", async ({ page }) => {
    await goToHomepage(page);
    await page.getByRole("button", { name: "SIGN IN" }).click();
    await page.waitForSelector('[role="dialog"]');
    const passkeyBtn = page.getByRole("button", { name: /passkey/i });
    await expect(passkeyBtn).toBeVisible();
    const icon = passkeyBtn.locator("svg");
    await expect(icon).toBeVisible();
  });

  test("passkey/email divider renders", async ({ page }) => {
    await goToHomepage(page);
    await page.getByRole("button", { name: "SIGN IN" }).click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page.getByText("— or —")).toBeVisible();
  });

  test("admin login page renders form elements", async ({ page }) => {
    await page.goto("/admin/login");
    await page.waitForLoadState("networkidle");
    await expect(page.getByPlaceholder(/admin@startlineau/i)).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("security settings redirect for unauthenticated users", async ({ page }) => {
    await page.goto("/settings/security");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/settings\/security/);
  });
});
