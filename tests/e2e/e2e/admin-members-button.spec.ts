import { test, expect } from '@playwright/test';
import { loginAsAdminQuick } from '../helpers/auth';

interface ConsoleMessage {
  type: string;
  text: string;
  timestamp: string;
  location?: string;
}

interface NetworkRequest {
  url: string;
  status: number;
  method: string;
  timestamp: string;
}

test.describe('Admin Members - Add Member Button Test', () => {
  let consoleMessages: ConsoleMessage[] = [];
  let networkRequests: NetworkRequest[] = [];
  const baseUrl = 'https://cjd80.rbw.ovh';

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    networkRequests = [];

    // Capture all console messages
    page.on('console', (msg) => {
      const consoleEntry: ConsoleMessage = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
        location: msg.location().url
      };
      consoleMessages.push(consoleEntry);
      console.log('[CONSOLE ' + msg.type().toUpperCase() + '] ' + msg.text());
    });

    // Capture network responses
    page.on('response', async (response) => {
      const status = response.status();
      const url = response.url();
      const method = response.request().method();

      networkRequests.push({
        url,
        status,
        method,
        timestamp: new Date().toISOString()
      });

      if (status >= 400) {
        console.log('[NETWORK ERROR] ' + status + ' ' + method + ' ' + url);
      }
    });

    await loginAsAdminQuick(page, baseUrl);
  });

  test.afterEach(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));

    console.log('\n--- Network Requests ---');
    console.log('Total requests: ' + networkRequests.length);
    const errorRequests = networkRequests.filter(r => r.status >= 400);
    console.log('Requests with errors (4xx/5xx): ' + errorRequests.length);
    if (errorRequests.length > 0) {
      errorRequests.forEach(req => {
        console.log('  [' + req.status + '] ' + req.method + ' ' + req.url.substring(0, 100));
      });
    }

    console.log('\n--- Console Messages ---');
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');
    console.log('Total console messages: ' + consoleMessages.length);
    console.log('Errors: ' + errors.length);
    console.log('Warnings: ' + warnings.length);

    if (errors.length > 0) {
      console.log('\n  Errors:');
      errors.forEach(err => {
        console.log('    - ' + err.text.substring(0, 150));
        if (err.location) console.log('      at ' + err.location);
      });
    }

    console.log('\n' + '='.repeat(80));
  });

  test('Navigate to /admin/members and verify page loads', async ({ page }) => {
    console.log('\n[TEST] Navigating to /admin/members...');
    
    await page.goto(`${baseUrl}/admin/members`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('[TEST] URL: ' + page.url());
    console.log('[TEST] Title: ' + await page.title());

    const pageContent = await page.content();
    const isPageLoaded = pageContent.length > 100;
    console.log('[TEST] Page content length: ' + pageContent.length);
    expect(isPageLoaded).toBe(true);
  });

  test('Take snapshot of /admin/members page', async ({ page }) => {
    console.log('\n[TEST] Taking page snapshot...');
    
    await page.goto(`${baseUrl}/admin/members`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const title = await page.title();
    console.log('[TEST] Page title: ' + title);

    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const forms = await page.locator('form').count();

    console.log('[TEST] Page structure:');
    console.log('  - Total buttons: ' + buttons);
    console.log('  - Total inputs: ' + inputs);
    console.log('  - Total forms: ' + forms);

    await page.screenshot({ path: '/srv/workspace/cjd80/tests/e2e/screenshots/admin-members-snapshot.png' });
    console.log('[TEST] Screenshot saved');
  });

  test('Find and list all buttons on page', async ({ page }) => {
    console.log('\n[TEST] Searching for buttons...');
    
    await page.goto(`${baseUrl}/admin/members`);
    await page.waitForLoadState('networkidle');

    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();

    console.log('[TEST] All buttons found on page (' + buttonCount + '):');
    for (let i = 0; i < Math.min(buttonCount, 30); i++) {
      const btn = allButtons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const disabled = await btn.getAttribute('disabled');
      console.log('  Button ' + (i + 1) + ': "' + (text || '(empty)') + '"' + (ariaLabel ? ' [aria: ' + ariaLabel + ']' : '') + (disabled ? ' [DISABLED]' : ''));
    }

    expect(buttonCount).toBeGreaterThan(0);
  });

  test('Click the add member button and verify response', async ({ page }) => {
    console.log('\n[TEST] Testing add member button...');
    
    await page.goto(`${baseUrl}/admin/members`);
    await page.waitForLoadState('networkidle');

    // Find button with various possible texts
    const buttonTexts = [
      'Ajouter un membre',
      'Ajouter',
      'Nouveau membre',
      'Add Member',
      'Add',
      'Nouveau'
    ];

    let buttonClicked = false;
    for (const text of buttonTexts) {
      const button = page.locator('button:has-text("' + text + '")').first();
      const count = await button.count();
      if (count > 0) {
        console.log('[TEST] Found button: "' + text + '", clicking...');
        
        const urlBefore = page.url();
        await button.click();
        await page.waitForTimeout(1500);
        const urlAfter = page.url();

        console.log('[TEST] URL before: ' + urlBefore);
        console.log('[TEST] URL after: ' + urlAfter);
        console.log('[TEST] URL changed: ' + (urlBefore !== urlAfter));

        // Check for modals
        const modals = await page.locator('[role="dialog"]').count();
        console.log('[TEST] Modals detected: ' + modals);

        buttonClicked = true;
        break;
      }
    }

    if (!buttonClicked) {
      console.log('[TEST] Add member button not found');
      console.log('[TEST] Button count: ' + await page.locator('button').count());
    }

    expect(buttonClicked).toBe(true);
  });

  test('Capture and report JavaScript errors', async ({ page }) => {
    console.log('\n[TEST] Capturing JavaScript errors...');
    
    await page.goto(`${baseUrl}/admin/members`);
    await page.waitForLoadState('networkidle');

    const errors = consoleMessages.filter(m => m.type === 'error');
    console.log('[TEST] JavaScript errors before button click: ' + errors.length);
    errors.forEach((err, idx) => {
      console.log('  ' + (idx + 1) + '. ' + err.text.substring(0, 150));
    });

    // Find and click button
    const button = page.locator('button:has-text("Ajouter un membre"), button:has-text("Ajouter"), button:has-text("Add Member")').first();
    if (await button.count() > 0) {
      const errorCountBefore = consoleMessages.filter(m => m.type === 'error').length;
      
      await button.click();
      await page.waitForTimeout(1500);

      const errorCountAfter = consoleMessages.filter(m => m.type === 'error').length;
      const newErrors = errorCountAfter - errorCountBefore;
      
      console.log('[TEST] New JavaScript errors after click: ' + newErrors);
    }
  });

  test('Document complete behavior', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('COMPLETE BEHAVIOR DOCUMENTATION');
    console.log('='.repeat(80));
    
    await page.goto(`${baseUrl}/admin/members`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('\n1. INITIAL PAGE STATE');
    console.log('   URL: ' + page.url());
    console.log('   Title: ' + await page.title());

    console.log('\n2. BUTTON DETECTION');
    const allButtons = await page.locator('button').evaluateAll((buttons) => {
      return buttons.map((btn, idx) => ({
        index: idx,
        text: (btn.textContent || '').trim(),
        ariaLabel: btn.getAttribute('aria-label') || '(none)',
        visible: (btn as HTMLElement).offsetParent !== null,
        disabled: btn.hasAttribute('disabled')
      }));
    });

    console.log('   Total buttons: ' + allButtons.length);
    allButtons.forEach((btn) => {
      if (btn.text.includes('Ajouter') || btn.text.includes('Add') || btn.text.includes('Nouveau')) {
        console.log('   [CANDIDATE] "' + btn.text + '"');
        console.log('      visible: ' + btn.visible + ', disabled: ' + btn.disabled);
      }
    });

    console.log('\n3. NETWORK REQUESTS');
    console.log('   Total: ' + networkRequests.length);
    const errors = networkRequests.filter(r => r.status >= 400);
    console.log('   Errors (4xx/5xx): ' + errors.length);

    console.log('\n4. CONSOLE STATE');
    const jsErrors = consoleMessages.filter(m => m.type === 'error');
    console.log('   JavaScript errors: ' + jsErrors.length);
    if (jsErrors.length > 0) {
      jsErrors.slice(0, 5).forEach((err, idx) => {
        console.log('     ' + (idx + 1) + '. ' + err.text.substring(0, 100));
      });
    }

    console.log('\n' + '='.repeat(80));
  });
});
