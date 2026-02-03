import { test, expect, type Response } from '@playwright/test';
import { loginAsAdminQuick } from '../helpers/auth';

interface NetworkError {
  url: string;
  status: number;
  method: string;
  timestamp: string;
}

interface ConsoleError {
  type: string;
  text: string;
  timestamp: string;
}

test.describe('Admin Network & Console Audit', () => {
  let networkErrors: NetworkError[] = [];
  let consoleErrors: ConsoleError[] = [];
  let allRequests: { url: string; status: number; method: string }[] = [];
  const baseUrl = 'https://cjd80.rbw.ovh';

  test.beforeEach(async ({ page }) => {
    networkErrors = [];
    consoleErrors = [];
    allRequests = [];

    // Capture all network responses
    page.on('response', async (response) => {
      const status = response.status();
      const url = response.url();
      const method = response.request().method();

      // Skip external resources
      if (!url.startsWith(baseUrl)) {
        return;
      }

      allRequests.push({ url, status, method });

      if (status >= 400) {
        networkErrors.push({
          url,
          status,
          method,
          timestamp: new Date().toISOString()
        });
        console.log(`[NETWORK ERROR] ${status} ${method} ${url}`);
      }
    });

    // Capture all console messages
    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        consoleErrors.push({
          type,
          text: msg.text(),
          timestamp: new Date().toISOString()
        });
        console.log(`[CONSOLE ${type.toUpperCase()}] ${msg.text()}`);
      }
    });

    await loginAsAdminQuick(page, baseUrl);
  });

  test.afterEach(async () => {
    // Print summary after each test
    console.log('\n=== Network Audit Summary ===');
    console.log(`Total requests: ${allRequests.length}`);
    console.log(`Network errors (4xx/5xx): ${networkErrors.length}`);
    console.log(`Console errors/warnings: ${consoleErrors.length}`);

    if (networkErrors.length > 0) {
      console.log('\n--- Network Errors ---');
      networkErrors.forEach(err => {
        console.log(`  ${err.status} ${err.method} ${err.url}`);
      });
    }

    if (consoleErrors.length > 0) {
      console.log('\n--- Console Errors ---');
      consoleErrors.forEach(err => {
        console.log(`  [${err.type}] ${err.text.substring(0, 200)}`);
      });
    }
  });

  test('Audit /admin - Dashboard principal', async ({ page }) => {
    await page.goto(`${baseUrl}/admin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify page loaded
    await expect(page.locator('body')).toBeVisible();

    // Click through tabs if they exist
    const tabs = ['Idées', 'Événements'];
    for (const tab of tabs) {
      const tabElement = page.locator(`text=${tab}`).first();
      if (await tabElement.isVisible().catch(() => false)) {
        await tabElement.click();
        await page.waitForTimeout(1000);
      }
    }

    // Report network errors as test failures
    expect(networkErrors.filter(e => e.status === 404).length,
      `Found ${networkErrors.filter(e => e.status === 404).length} 404 errors on /admin`
    ).toBe(0);
  });

  test('Audit /admin/branding - Configuration branding', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/branding`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Expand all accordion sections
    const sections = ['Organisation', 'Apparence', 'PWA', 'Liens'];
    for (const section of sections) {
      const sectionTrigger = page.locator(`text=${section}`).first();
      if (await sectionTrigger.isVisible().catch(() => false)) {
        await sectionTrigger.click();
        await page.waitForTimeout(500);
      }
    }

    expect(networkErrors.filter(e => e.status === 404).length,
      `Found ${networkErrors.filter(e => e.status === 404).length} 404 errors on /admin/branding`
    ).toBe(0);
  });

  test('Audit /admin/members - Gestion des membres', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/members`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to interact with member list
    const memberCard = page.locator('[data-testid^="card-member-"]').first();
    if (await memberCard.isVisible().catch(() => false)) {
      await memberCard.click();
      await page.waitForTimeout(1000);
    }

    expect(networkErrors.filter(e => e.status === 404).length,
      `Found ${networkErrors.filter(e => e.status === 404).length} 404 errors on /admin/members`
    ).toBe(0);
  });

  test('Audit /admin/patrons - Gestion des mécènes', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/patrons`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to interact with patron list
    const patronCard = page.locator('[data-testid^="patron-item-"]').first();
    if (await patronCard.isVisible().catch(() => false)) {
      await patronCard.click();
      await page.waitForTimeout(1000);
    }

    expect(networkErrors.filter(e => e.status === 404).length,
      `Found ${networkErrors.filter(e => e.status === 404).length} 404 errors on /admin/patrons`
    ).toBe(0);
  });

  test('Audit /admin/loans - Gestion des prêts', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/loans`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify page exists
    await expect(page.locator('body')).toBeVisible();

    expect(networkErrors.filter(e => e.status === 404).length,
      `Found ${networkErrors.filter(e => e.status === 404).length} 404 errors on /admin/loans`
    ).toBe(0);
  });

  test('Audit /admin/financial - Dashboard financier', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/financial`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate through financial tabs if present
    const tabs = ['Budgets', 'Dépenses', 'Rapports'];
    for (const tab of tabs) {
      const tabElement = page.locator(`text=${tab}`).first();
      if (await tabElement.isVisible().catch(() => false)) {
        await tabElement.click();
        await page.waitForTimeout(1000);
      }
    }

    expect(networkErrors.filter(e => e.status === 404).length,
      `Found ${networkErrors.filter(e => e.status === 404).length} 404 errors on /admin/financial`
    ).toBe(0);
  });

  test('Audit /admin/tracking - Suivi', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/tracking`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(networkErrors.filter(e => e.status === 404).length,
      `Found ${networkErrors.filter(e => e.status === 404).length} 404 errors on /admin/tracking`
    ).toBe(0);
  });

  test('Audit /admin/settings - Configuration', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(networkErrors.filter(e => e.status === 404).length,
      `Found ${networkErrors.filter(e => e.status === 404).length} 404 errors on /admin/settings`
    ).toBe(0);
  });

  test('Full Admin Navigation Audit - All Routes', async ({ page }) => {
    const adminRoutes = [
      '/admin',
      '/admin/branding',
      '/admin/members',
      '/admin/patrons',
      '/admin/loans',
      '/admin/financial',
      '/admin/tracking',
      '/admin/settings'
    ];

    const routeErrors: { route: string; errors: NetworkError[] }[] = [];

    for (const route of adminRoutes) {
      const routeNetworkErrors: NetworkError[] = [];

      // Clear and listen for this route
      const responseHandler = (response: Response) => {
        const status = response.status();
        const url = response.url();
        const method = response.request().method();

        if (url.startsWith(baseUrl) && status >= 400) {
          routeNetworkErrors.push({
            url,
            status,
            method,
            timestamp: new Date().toISOString()
          });
        }
      };

      page.on('response', responseHandler);

      await page.goto(`${baseUrl}${route}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      page.off('response', responseHandler);

      if (routeNetworkErrors.length > 0) {
        routeErrors.push({ route, errors: routeNetworkErrors });
      }
    }

    // Print comprehensive report
    console.log('\n=== FULL ADMIN AUDIT REPORT ===');
    console.log(`Routes tested: ${adminRoutes.length}`);
    console.log(`Routes with errors: ${routeErrors.length}`);

    if (routeErrors.length > 0) {
      console.log('\n--- Errors by Route ---');
      for (const { route, errors } of routeErrors) {
        console.log(`\n${route}:`);
        for (const err of errors) {
          console.log(`  ${err.status} ${err.method} ${err.url}`);
        }
      }
    }

    // Fail test if any 404 errors found
    const total404s = routeErrors.reduce(
      (sum, { errors }) => sum + errors.filter(e => e.status === 404).length,
      0
    );

    expect(total404s, `Found ${total404s} total 404 errors across admin routes`).toBe(0);
  });
});
