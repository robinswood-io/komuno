import { test, expect } from '@playwright/test';

test.describe('MemberSearchSelect Component - With Authentication', () => {
  test.beforeEach(async ({ page, context }) => {
    context.ignoreHTTPSErrors = true;
  });

  test('Test 1: Log in and navigate to tasks admin', async ({ page }) => {
    console.log('Test 1: Starting login and tasks admin test...');

    // Navigate to login page
    await page.goto('https://komuno.rbw.ovh/login', { waitUntil: 'networkidle' });
    console.log('Navigated to login page');
    await page.waitForTimeout(500);

    // Enter admin credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Se connecter"), button:has-text("Connect")').first();

    if (await emailInput.isVisible().catch(() => false)) {
      console.log('Found email input, entering credentials...');
      await emailInput.fill('admin@test.local');
      console.log('Filled email');

      if (await passwordInput.isVisible().catch(() => false)) {
        await passwordInput.fill('password');
        console.log('Filled password');
      }

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        console.log('Clicked submit button');
        await page.waitForURL('**/admin/**', { timeout: 10000 }).catch(() => console.log('No URL redirect'));
        await page.waitForLoadState('networkidle');
        console.log('Login successful');
      }
    } else {
      console.log('Email input not found, checking if already logged in...');
    }

    // Screenshot after login
    await page.screenshot({ path: 'auth-after-login.png', fullPage: true });
    console.log('Screenshot: After login');

    // Navigate to tasks admin page
    await page.goto('https://komuno.rbw.ovh/admin/members/tasks', { waitUntil: 'networkidle' });
    console.log('Navigated to tasks admin page');
    await page.waitForTimeout(1000);

    // Screenshot of tasks page
    await page.screenshot({ path: 'auth-tasks-page.png', fullPage: true });
    console.log('Screenshot: Tasks admin page');

    // Look for the "Créer une tâche" button
    const buttonSelectors = [
      'button:has-text("Créer une tâche")',
      'button:has-text("Créer")',
      'button:has-text("Create")',
      'button[aria-label*="creer"]',
      'button[aria-label*="create"]',
    ];

    let createButton = null;
    for (const selector of buttonSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible().catch(() => false)) {
        createButton = el;
        console.log(`Found create button with selector: ${selector}`);
        break;
      }
    }

    if (!createButton) {
      console.log('Create button not found, listing all visible buttons...');
      const buttons = page.locator('button');
      const count = await buttons.count();
      console.log(`Found ${count} buttons`);
      const allButtonTexts = await buttons.allTextContents();
      console.log('Button texts:', allButtonTexts);
    } else {
      await createButton.click();
      console.log('Clicked create button');
      await page.waitForTimeout(1500);

      // Screenshot of dialog
      await page.screenshot({ path: 'auth-create-dialog.png', fullPage: true });
      console.log('Screenshot: Create task dialog');

      // Look for the member search field
      const inputLabels = page.locator('label');
      const labelCount = await inputLabels.count();
      console.log(`Found ${labelCount} labels`);

      const labelTexts = await inputLabels.allTextContents();
      console.log('Label texts:', labelTexts);

      // Find input near "Responsable" or "Membre" label
      const inputs = page.locator('input[type="text"], input[type="search"], [role="combobox"]');
      const inputCount = await inputs.count();
      console.log(`Found ${inputCount} input fields`);

      if (inputCount > 0) {
        // Try to interact with first input
        const firstInput = inputs.first();
        console.log('Trying to interact with first input field');

        // Type in the field
        await firstInput.click().catch(() => console.log('Could not click input'));
        await firstInput.fill('jean').catch(() => console.log('Could not fill input'));
        console.log('Typed "jean" in search field');
        await page.waitForTimeout(800);

        // Screenshot of search results
        await page.screenshot({ path: 'auth-search-results.png', fullPage: true });
        console.log('Screenshot: Search results');

        // Check for dropdown/popup
        const options = page.locator('[role="option"], .dropdown-item, li[role="option"], [data-testid*="option"]');
        const optionCount = await options.count();
        console.log(`Found ${optionCount} options in dropdown`);

        if (optionCount > 0) {
          const optionTexts = await options.allTextContents();
          console.log('Option texts:', optionTexts);
        }
      }

      // Close dialog
      await page.press('body', 'Escape');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'auth-dialog-closed.png', fullPage: true });
      console.log('Screenshot: Dialog closed');
    }
  });

  test('Test 2: Navigate to members and check relations', async ({ page }) => {
    console.log('Test 2: Starting members relations test...');

    // Navigate directly to members page
    await page.goto('https://komuno.rbw.ovh/admin/members', { waitUntil: 'networkidle' });
    console.log('Navigated to members page');
    await page.waitForTimeout(1000);

    // Screenshot
    await page.screenshot({ path: 'auth-members-list.png', fullPage: true });
    console.log('Screenshot: Members list');

    // Try navigating to relations directly
    await page.goto('https://komuno.rbw.ovh/admin/members/relations', { waitUntil: 'networkidle' });
    console.log('Navigated to relations page');
    await page.waitForTimeout(1000);

    // Screenshot
    await page.screenshot({ path: 'auth-relations-page.png', fullPage: true });
    console.log('Screenshot: Relations page');

    // Look for create relation button
    const buttons = page.locator('button');
    const buttonTexts = await buttons.allTextContents();
    console.log('Available buttons on relations page:', buttonTexts);

    const createButton = buttons.filter({ hasText: /Créer|Create|Ajouter/ }).first();

    if (await createButton.isVisible().catch(() => false)) {
      console.log('Found create button');
      await createButton.click();
      await page.waitForTimeout(1500);

      // Screenshot of relation dialog
      await page.screenshot({ path: 'auth-relation-dialog.png', fullPage: true });
      console.log('Screenshot: Create relation dialog');

      // Check form fields
      const inputs = page.locator('input[type="text"], input[type="search"], [role="combobox"]');
      const inputCount = await inputs.count();
      console.log(`Found ${inputCount} input fields in relation form`);

      const labels = page.locator('label');
      const labelTexts = await labels.allTextContents();
      console.log('Form labels:', labelTexts);

      // Try searching in first field
      if (inputCount > 0) {
        const firstInput = inputs.first();
        await firstInput.fill('test');
        await page.waitForTimeout(800);

        // Screenshot of relation search
        await page.screenshot({ path: 'auth-relation-search.png', fullPage: true });
        console.log('Screenshot: Relation search results');
      }
    } else {
      console.log('Create button not found on relations page');
    }
  });

  test('Test 3: Component interaction - clear and re-search', async ({ page }) => {
    console.log('Test 3: Starting component interaction test...');

    // Navigate to tasks
    await page.goto('https://komuno.rbw.ovh/admin/members/tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Open create dialog
    const createButton = page.locator('button').filter({ hasText: /Créer|Create/ }).first();
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1500);

      // Find search field
      const inputs = page.locator('input[type="text"], input[type="search"], [role="combobox"]');

      if ((await inputs.count()) > 0) {
        const searchField = inputs.first();

        // Test sequence: type -> clear -> type different -> clear
        const searches = ['marie', 'pierre', 'anne'];

        for (const name of searches) {
          await searchField.clear();
          await searchField.fill(name);
          console.log(`Searched for: ${name}`);
          await page.waitForTimeout(800);

          const options = page.locator('[role="option"], li[role="option"]');
          const count = await options.count();
          console.log(`  Found ${count} results`);
        }

        // Final screenshot
        await page.screenshot({ path: 'auth-final-search.png', fullPage: true });
        console.log('Screenshot: Final search state');
      }
    }
  });
});
