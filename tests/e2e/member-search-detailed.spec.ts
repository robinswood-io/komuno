import { test, expect } from '@playwright/test';

test.describe('MemberSearchSelect Component - Detailed Testing', () => {
  test.beforeEach(async ({ page, context }) => {
    context.ignoreHTTPSErrors = true;
    // Navigate to home first
    await page.goto('https://komuno.rbw.ovh', { waitUntil: 'networkidle' });
  });

  test('Test 1: Navigate to tasks admin and open create dialog', async ({ page }) => {
    console.log('Test 1: Starting tasks admin test...');

    // Navigate to tasks admin page
    await page.goto('https://komuno.rbw.ovh/admin/members/tasks', { waitUntil: 'networkidle' });
    console.log('Navigated to tasks admin page');

    // Wait and take screenshot of page
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test1-tasks-page.png', fullPage: true });
    console.log('Screenshot 1: Tasks admin page');

    // Look for create button - try multiple selectors
    const createButtonSelectors = [
      'button:has-text("Créer une tâche")',
      'button:has-text("Create")',
      '[data-testid="create-task"]',
      'button[aria-label*="Create"]',
    ];

    let createButton = null;
    for (const selector of createButtonSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible().catch(() => false)) {
        createButton = el;
        console.log(`Found create button with selector: ${selector}`);
        break;
      }
    }

    if (!createButton) {
      console.log('Create button not found, listing all visible buttons...');
      const buttons = await page.locator('button').allTextContents();
      console.log('Available buttons:', buttons);
    } else {
      await createButton.click();
      console.log('Clicked create button');
      await page.waitForTimeout(1500);

      // Take screenshot of dialog
      await page.screenshot({ path: 'test1-create-dialog.png', fullPage: true });
      console.log('Screenshot 2: Create task dialog');

      // Look for input fields in dialog
      const inputs = page.locator('input[type="text"], input[type="search"], textarea, [role="combobox"]');
      const inputCount = await inputs.count();
      console.log(`Found ${inputCount} input fields in dialog`);

      // Try to find member search field
      const searchField = page.locator('input').filter({ has: page.locator('label:has-text("member"), label:has-text("Membre")').or(page.locator('label:has-text("responsable")')) }).first();

      if (await searchField.isVisible().catch(() => false)) {
        console.log('Found member search field');

        // Type in search field
        await searchField.fill('jean');
        console.log('Typed "jean" in search field');
        await page.waitForTimeout(800);

        // Take screenshot of filtered results
        await page.screenshot({ path: 'test1-search-results.png', fullPage: true });
        console.log('Screenshot 3: Search results');

        // Check for dropdown options
        const options = page.locator('[role="option"], .dropdown-item, .select-item, li[role="option"]');
        const optionCount = await options.count();
        console.log(`Found ${optionCount} options in dropdown`);

        if (optionCount > 0) {
          const firstOption = options.first();
          const optionText = await firstOption.textContent();
          console.log(`First option text: ${optionText}`);
        }
      } else {
        console.log('Member search field not found');
        // Log all input fields
        const allInputs = await page.locator('input').allTextContents();
        console.log('All input fields:', allInputs);
      }

      // Close dialog
      await page.press('body', 'Escape');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test1-after-close.png', fullPage: true });
      console.log('Screenshot 4: Dialog closed');
    }
  });

  test('Test 2: Navigate to members page and check for relations', async ({ page }) => {
    console.log('Test 2: Starting members page test...');

    await page.goto('https://komuno.rbw.ovh/admin/members', { waitUntil: 'networkidle' });
    console.log('Navigated to members page');

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test2-members-page.png', fullPage: true });
    console.log('Screenshot 1: Members page');

    // Look for tabs
    const tabs = page.locator('[role="tab"], .tab, [data-testid*="tab"]');
    const tabCount = await tabs.count();
    console.log(`Found ${tabCount} tabs`);

    // List all tab contents
    const tabContents = await tabs.allTextContents();
    console.log('Available tabs:', tabContents);

    // Look for relations-related tab
    const relationsTab = page.locator('[role="tab"]:has-text("Relation"), button:has-text("Relation")').first();

    if (await relationsTab.isVisible().catch(() => false)) {
      console.log('Found Relations tab');
      await relationsTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'test2-relations-tab.png', fullPage: true });
      console.log('Screenshot 2: Relations tab opened');
    } else {
      console.log('Relations tab not found, trying direct URL...');
      await page.goto('https://komuno.rbw.ovh/admin/members/relations', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test2-relations-direct.png', fullPage: true });
      console.log('Screenshot 2: Relations page (direct URL)');
    }

    // Look for create relation button
    const createRelationButtons = page.locator('button').filter({ hasText: /Créer|Create|Ajouter/ });
    const buttonCount = await createRelationButtons.count();
    console.log(`Found ${buttonCount} potential create buttons`);

    if (buttonCount > 0) {
      const firstButton = createRelationButtons.first();
      const buttonText = await firstButton.textContent();
      console.log(`First button text: ${buttonText}`);

      await firstButton.click();
      console.log('Clicked create button');
      await page.waitForTimeout(1500);

      await page.screenshot({ path: 'test2-relation-dialog.png', fullPage: true });
      console.log('Screenshot 3: Create relation dialog');

      // Look for multiple member search fields
      const inputs = page.locator('input[type="text"], input[type="search"], [role="combobox"]');
      const inputCount = await inputs.count();
      console.log(`Found ${inputCount} input fields in relation dialog`);

      // Check for labels indicating member fields
      const labels = page.locator('label');
      const labelTexts = await labels.allTextContents();
      console.log('Form labels:', labelTexts);
    }
  });

  test('Test 3: Search with special characters and empty results', async ({ page }) => {
    console.log('Test 3: Starting advanced search test...');

    await page.goto('https://komuno.rbw.ovh/admin/members/tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Open create dialog
    const createButton = page.locator('button').filter({ hasText: /Créer|Create/ }).first();
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1500);

      // Find and interact with search field
      const searchInput = page.locator('input').first();
      if (await searchInput.isVisible().catch(() => false)) {
        // Test 3a: Search for existing name
        await searchInput.fill('marie');
        console.log('Typed "marie" in search field');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test3-search-marie.png', fullPage: true });
        console.log('Screenshot 1: Search for "marie"');

        // Test 3b: Search for non-existent
        await searchInput.clear();
        await searchInput.fill('ZZZZZ');
        console.log('Typed "ZZZZZ" (non-existent)');
        await page.waitForTimeout(800);
        await page.screenshot({ path: 'test3-search-empty.png', fullPage: true });
        console.log('Screenshot 2: Search with no results');

        // Test 3c: Clear and show all
        await searchInput.clear();
        console.log('Cleared search field');
        await page.waitForTimeout(800);
        await page.screenshot({ path: 'test3-search-all.png', fullPage: true });
        console.log('Screenshot 3: All members displayed');
      }
    }
  });
});
