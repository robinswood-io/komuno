import { chromium } from 'playwright';

async function takeQuickScreenshot() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    // Login
    console.log('Login...');
    await page.goto('https://cjd80.rbw.ovh/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.fill('input[type="email"]', 'admin@test.local');
    await page.fill('input[type="password"]', 'any-password');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 20000 });

    // Navigate to Relations
    console.log('Navigate to Relations...');
    await page.goto('https://cjd80.rbw.ovh/admin/members/member-graph', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for graph to render
    await page.waitForTimeout(8000);

    // Take screenshots
    await page.screenshot({
      path: '/tmp/relations-improved.png',
      fullPage: true,
    });

    console.log('✅ Screenshot saved: /tmp/relations-improved.png');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

takeQuickScreenshot();
