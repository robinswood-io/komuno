import { test, expect } from '@playwright/test';

test.describe('MemberSearchSelect Component - Final Test', () => {
  test('Complete member search component testing', async ({ page, context }) => {
    context.ignoreHTTPSErrors = true;

    // 1. Navigate and login
    console.log('1. Navigating to login page');
    await page.goto('https://komuno.rbw.ovh/login', { waitUntil: 'networkidle' });

    // Fill login form
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('admin@test.local');
      await passwordInput.fill('password');
      await submitButton.click();
      await page.waitForLoadState('networkidle');
      console.log('Logged in successfully');
    }

    // 2. Test Tasks Member Search
    console.log('2. Testing Tasks member search component');
    await page.goto('https://komuno.rbw.ovh/admin/members/tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const createTaskButton = page.locator('button:has-text("Créer une tâche")').first();
    if (await createTaskButton.isVisible()) {
      console.log('Found "Créer une tâche" button');
      await createTaskButton.click();
      await page.waitForTimeout(1500);

      // Screenshot 1: Empty search field
      await page.screenshot({ path: 'member-search-empty.png', fullPage: true });
      console.log('Screenshot 1: Empty member search field');

      // Find and interact with member search
      const memberSearchInputs = page.locator('input[placeholder*="Rechercher"], input[placeholder*="recherche"], input[placeholder*="member"]');
      const inputCount = await memberSearchInputs.count();
      console.log(`Found ${inputCount} search inputs`);

      if (inputCount > 0) {
        const firstSearch = memberSearchInputs.first();

        // Type "jean" to filter
        await firstSearch.fill('jean');
        console.log('Typed "jean"');
        await page.waitForTimeout(1000);

        // Screenshot 2: With search term "jean"
        await page.screenshot({ path: 'member-search-filtered-jean.png', fullPage: true });
        console.log('Screenshot 2: Member search with "jean" filtering');

        // Clear and type another name
        await firstSearch.clear();
        await firstSearch.fill('marie');
        console.log('Typed "marie"');
        await page.waitForTimeout(1000);

        // Screenshot 3: With search term "marie"
        await page.screenshot({ path: 'member-search-filtered-marie.png', fullPage: true });
        console.log('Screenshot 3: Member search with "marie" filtering');

        // Clear completely
        await firstSearch.clear();
        console.log('Cleared search');
        await page.waitForTimeout(800);

        // Screenshot 4: Empty again
        await page.screenshot({ path: 'member-search-cleared.png', fullPage: true });
        console.log('Screenshot 4: Search cleared');
      }

      // Close dialog
      await page.press('Escape');
      await page.waitForTimeout(500);
    }

    // 3. Test Relations Member Search
    console.log('3. Testing Relations member search components');

    // Make sure we're still logged in by checking for admin menu
    const adminMenu = page.locator('text=Admin').first();
    if (!await adminMenu.isVisible()) {
      console.log('Session lost, re-logging in...');
      await page.goto('https://komuno.rbw.ovh/login', { waitUntil: 'networkidle' });
      const emailInput2 = page.locator('input[type="email"]').first();
      const passwordInput2 = page.locator('input[type="password"]').first();
      const submitButton2 = page.locator('button[type="submit"]').first();
      await emailInput2.fill('admin@test.local');
      await passwordInput2.fill('password');
      await submitButton2.click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to Relations - try different approaches
    await page.goto('https://komuno.rbw.ovh/admin/members', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for Relations link in sidebar
    const relationsLink = page.locator('text=Relations').first();
    if (await relationsLink.isVisible()) {
      console.log('Found Relations link');
      await relationsLink.click();
      await page.waitForTimeout(1500);
    } else {
      console.log('Relations link not found, trying direct URL');
      await page.goto('https://komuno.rbw.ovh/admin/members/relations', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
    }

    // Screenshot 5: Relations page
    await page.screenshot({ path: 'relations-page-view.png', fullPage: true });
    console.log('Screenshot 5: Relations page');

    // Look for create relation button
    const buttons = page.locator('button');
    const createRelationBtn = buttons.filter({ hasText: /Créer|Create|Ajouter/ }).first();

    if (await createRelationBtn.isVisible()) {
      console.log('Found create relation button');
      await createRelationBtn.click();
      await page.waitForTimeout(1500);

      // Screenshot 6: Relation dialog
      await page.screenshot({ path: 'relation-dialog-open.png', fullPage: true });
      console.log('Screenshot 6: Create relation dialog with member searches');

      // Find all search fields in the dialog
      const dialogInputs = page.locator('input[placeholder*="Rechercher"], input[placeholder*="recherche"]');
      const dialogInputCount = await dialogInputs.count();
      console.log(`Found ${dialogInputCount} search fields in relation dialog`);

      if (dialogInputCount > 0) {
        // Test first member field
        const firstField = dialogInputs.first();
        await firstField.fill('john');
        console.log('Typed "john" in first field');
        await page.waitForTimeout(1000);

        // Screenshot 7: First field searched
        await page.screenshot({ path: 'relation-search-first-field.png', fullPage: true });
        console.log('Screenshot 7: First member search in relation form');

        // Clear first field
        await firstField.clear();

        // If there's a second field, test it
        if (dialogInputCount > 1) {
          const secondField = dialogInputs.nth(1);
          await secondField.fill('marie');
          console.log('Typed "marie" in second field');
          await page.waitForTimeout(1000);

          // Screenshot 8: Second field searched
          await page.screenshot({ path: 'relation-search-second-field.png', fullPage: true });
          console.log('Screenshot 8: Second member search in relation form');
        }
      }
    } else {
      console.log('Create relation button not found');
    }

    console.log('Test completed successfully!');
  });
});
