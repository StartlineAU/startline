import { test, expect } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";
import { goToHomepage } from "./helpers";

test.describe("events page", () => {
  test("renders events page with content", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).not.toBeEmpty();
  });

  test("events listing visual snapshot", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("networkidle");
    await argosScreenshot(page, "events-listing");
  });

  test("search input is present", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("networkidle");
    const searchInput = page.getByPlaceholder(/search|location|city/i);
    await expect(searchInput.first()).toBeVisible();
  });

  test("search toolbar is present", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Event", { exact: true })).toBeVisible();
    await expect(page.getByText("Where", { exact: true })).toBeVisible();
  });

  test("list/map view toggle is present", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("view-mode-list")).toBeVisible();
    await expect(page.getByTestId("view-mode-map")).toBeVisible();
  });

  test("switching to map mode shows map container", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("view-mode-map").click();
    await expect(page.getByTestId("events-map")).toBeVisible();
  });
});

test.describe("event detail page", () => {
  test("event detail visual snapshot", async ({ page }) => {
    await page.goto("/events/seed-event-001");
    await page.waitForLoadState("networkidle");
    await argosScreenshot(page, "event-detail");
  });
});

test.describe("static pages", () => {
  test("contact page renders", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("contact page visual snapshot", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");
    await argosScreenshot(page, "contact-page");
  });
});
