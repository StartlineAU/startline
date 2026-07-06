import { chromium } from 'playwright';

// Known approved event from the seed data
const EVENT_ID = 'seed-event-001-apex-throwdown';

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const ctx  = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
const GO   = { waitUntil: 'domcontentloaded', timeout: 60000 };

try {
  // 1. Sign in as the seed organiser
  console.log('→ Signing in as test.organiser@startlineau.com...');
  await page.goto('http://localhost:3000', GO);
  await page.waitForTimeout(1500);
  await page.click('button:has-text("SIGN IN")');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', 'test.organiser@startlineau.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('✓ Signed in. URL:', page.url());

  // 2. Overview tab (existing dashboard + new tab strip)
  console.log('\n→ Overview tab...');
  await page.goto(`http://localhost:3000/organiser/events/${EVENT_ID}/dashboard`, GO);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tab-overview.png' });
  console.log('✓ URL:', page.url());

  // 3. Waves tab
  console.log('→ Waves tab...');
  await page.goto(`http://localhost:3000/organiser/events/${EVENT_ID}/waves`, GO);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tab-waves.png' });
  console.log('✓ URL:', page.url());

  // 4. Results — upload step
  console.log('→ Results upload step...');
  await page.goto(`http://localhost:3000/organiser/events/${EVENT_ID}/results`, GO);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tab-results-upload.png' });
  console.log('✓ URL:', page.url());

  // 5. Results — advance to review with demo data
  console.log('→ Loading demo data...');
  await page.click('button:has-text("load demo data")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'tab-results-review.png' });
  console.log('✓ Results review screenshot saved');

  console.log('\n✓ All done. Screenshots: tab-overview.png, tab-waves.png, tab-results-upload.png, tab-results-review.png');
} catch (e) {
  console.error('Error:', e.message);
  await page.screenshot({ path: 'error-state.png' }).catch(() => {});
  process.exit(1);
} finally {
  await browser.close();
}
