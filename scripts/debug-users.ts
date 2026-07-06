import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page    = await ctx.newPage();

  // Capture console errors from the server (they appear in the terminal, not browser)
  // Instead, let's call a diagnostic endpoint

  // Login
  await page.goto(`${BASE}/admin/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]',    "admin@startline.test");
  await page.fill('input[type="password"]', "Password123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/admin/dashboard`, { timeout: 15000 });
  console.log("Logged in");

  // Try each query individually to find the failing one
  const tests = [
    "/api/admin/users?page=1&limit=5",
    "/api/admin/registrations?page=1&limit=5",
    "/api/admin/audit?page=1&limit=5",
  ];

  for (const url of tests) {
    const result = await page.evaluate(async (u) => {
      const res  = await fetch(u);
      const body = await res.text();
      return { status: res.status, body: body.slice(0, 300) };
    }, url);
    console.log(`${url}: ${result.status} → ${result.body}`);
  }

  await browser.close();
}

run().catch((err) => { console.error(err); process.exit(1); });
