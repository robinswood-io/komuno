import { test } from '@playwright/test';

test.describe('MemberSearchSelect Component Focused Tests', () => {
  test('Capture MemberSearchSelect in task creation dialog with filtering', async ({ page, context }) => {
    context.ignoreHTTPSErrors = true;

    // Login
    await page.goto('https://komuno.rbw.ovh/login', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').fill('admin@test.local');
    await page.locator('input[type="password"]').fill('password');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');

    // Go to tasks
    await page.goto('https://komuno.rbw.ovh/admin/members/tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Open dialog
    await page.locator('button:has-text("Créer une tâche")').click();
    await page.waitForTimeout(1500);

    // Take initial screenshot of dialog
    await page.screenshot({ path: 'component-dialog-initial.png', fullPage: true });

    // Find the member search field
    const memberSearchField = page.locator('input[placeholder*="Rechercher"]').first();

    if (await memberSearchField.isVisible()) {
      // Scenario 1: Type "jean"
      await memberSearchField.fill('jean');
      await page.waitForTimeout(1200);
      await page.screenshot({ path: 'component-jean-search.png', fullPage: true });

      // Scenario 2: Type "pierre"
      await memberSearchField.clear();
      await memberSearchField.fill('pierre');
      await page.waitForTimeout(1200);
      await page.screenshot({ path: 'component-pierre-search.png', fullPage: true });

      // Scenario 3: Type "marie"
      await memberSearchField.clear();
      await memberSearchField.fill('marie');
      await page.waitForTimeout(1200);
      await page.screenshot({ path: 'component-marie-search.png', fullPage: true });

      // Scenario 4: Empty/clear
      await memberSearchField.clear();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'component-cleared.png', fullPage: true });

      // Scenario 5: Type special characters
      await memberSearchField.fill('@@');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'component-special-chars.png', fullPage: true });
    }
  });

  test('Verify component accessibility and keyboard interaction', async ({ page, context }) => {
    context.ignoreHTTPSErrors = true;

    // Login
    await page.goto('https://komuno.rbw.ovh/login', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').fill('admin@test.local');
    await page.locator('input[type="password"]').fill('password');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');

    // Go to tasks
    await page.goto('https://komuno.rbw.ovh/admin/members/tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Open dialog
    await page.locator('button:has-text("Créer une tâche")').click();
    await page.waitForTimeout(1500);

    // Focus on the member search field using Tab
    await page.press('body', 'Tab');
    await page.press('Tab');
    await page.press('Tab');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'component-focused.png', fullPage: true });

    // Type some text
    await page.type('body', 'test');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'component-typed.png', fullPage: true });

    // Press ArrowDown to navigate results
    await page.press('body', 'ArrowDown');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'component-arrow-down.png', fullPage: true });

    // Press Enter to select
    await page.press('body', 'Enter');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'component-selected.png', fullPage: true });
  });

  test('Component HTML structure and attributes', async ({ page, context }) => {
    context.ignoreHTTPSErrors = true;

    // Login
    await page.goto('https://komuno.rbw.ovh/login', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').fill('admin@test.local');
    await page.locator('input[type="password"]').fill('password');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');

    // Go to tasks
    await page.goto('https://komuno.rbw.ovh/admin/members/tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Open dialog
    await page.locator('button:has-text("Créer une tâche")').click();
    await page.waitForTimeout(1500);

    // Inspect component attributes
    const inputs = page.locator('input');
    const count = await inputs.count();
    console.log(`Total inputs in dialog: ${count}`);

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const placeholder = await input.getAttribute('placeholder');
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      console.log(`Input ${i}: type=${type}, placeholder=${placeholder}, id=${id}`);
    }

    // Get the combobox role elements
    const comboboxes = page.locator('[role="combobox"]');
    const comboboxCount = await comboboxes.count();
    console.log(`Total comboboxes: ${comboboxCount}`);

    // Get labels
    const labels = page.locator('label');
    const labelCount = await labels.count();
    const labelTexts = await labels.allTextContents();
    console.log(`Labels: ${labelTexts.join(', ')}`);

    // Final screenshot showing all elements
    await page.screenshot({ path: 'component-structure.png', fullPage: true });
  });
});
