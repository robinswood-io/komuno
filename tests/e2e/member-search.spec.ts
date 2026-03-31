import { test, expect } from '@playwright/test';

test.describe('MemberSearchSelect Component Tests', () => {
  test('should load komuno homepage and log in', async ({ page, context }) => {
    // Ignore HTTPS errors for self-signed certs
    context.ignoreHTTPSErrors = true;

    // Navigate to komuno
    await page.goto('https://komuno.rbw.ovh', { waitUntil: 'domcontentloaded' });

    // Take screenshot of homepage
    await page.screenshot({ path: 'komuno-homepage.png' });

    // Check for login page or redirect
    const title = await page.title();
    console.log('Page title:', title);

    // Look for login form
    const loginButton = page.locator('button:has-text("Se connecter"), button:has-text("Login"), a:has-text("Login")').first();
    const devLoginButton = page.locator('button:has-text("Dev Login"), button:has-text("DEV")').first();

    // Try dev login if available
    if (await devLoginButton.isVisible()) {
      console.log('Found DEV login button');
      await devLoginButton.click();
      await page.waitForURL('**/admin/**', { timeout: 5000 }).catch(() => console.log('URL pattern not matched'));
    } else if (await loginButton.isVisible()) {
      console.log('Found login button');
      await loginButton.click();
      await page.waitForLoadState('domcontentloaded');
    } else {
      console.log('No login button found, checking current page...');
    }

    await page.screenshot({ path: 'komuno-after-login.png' });
  });

  test('should navigate to tasks admin page and test member search', async ({ page, context }) => {
    context.ignoreHTTPSErrors = true;

    // Navigate directly to tasks admin page
    await page.goto('https://komuno.rbw.ovh/admin/members/tasks', { waitUntil: 'domcontentloaded' });

    await page.screenshot({ path: 'tasks-admin-page.png' });

    // Look for "Créer une tâche" button
    const createButton = page.locator('button:has-text("Créer une tâche"), button:has-text("Create")').first();

    if (await createButton.isVisible()) {
      console.log('Found "Créer une tâche" button');
      await createButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Take screenshot of dialog/form
      await page.screenshot({ path: 'create-task-dialog.png' });

      // Look for member search field
      const memberSearch = page.locator('input[placeholder*="member"], input[placeholder*="recherche"], input[placeholder*="select"]').first();

      if (await memberSearch.isVisible()) {
        console.log('Found member search field');
        await memberSearch.screenshot({ path: 'member-search-field.png' });

        // Type in search field
        await memberSearch.fill('jean');
        await page.waitForTimeout(500);

        // Take screenshot of filtered results
        await page.screenshot({ path: 'member-search-filtered.png' });

        // Check for search results
        const results = page.locator('[role="option"], li:has-text("jean"), div:has-text("jean")').first();
        if (await results.isVisible()) {
          console.log('Search results displayed');
        }
      }
    } else {
      console.log('Create button not found');
    }

    // Close dialog by pressing Escape
    await page.press('body', 'Escape');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'after-close-dialog.png' });
  });

  test('should test relations page member search', async ({ page, context }) => {
    context.ignoreHTTPSErrors = true;

    // Navigate to members page
    await page.goto('https://komuno.rbw.ovh/admin/members', { waitUntil: 'domcontentloaded' });

    await page.screenshot({ path: 'members-page.png' });

    // Look for Relations tab or link
    const relationsTab = page.locator('button:has-text("Relations"), a:has-text("Relations"), [role="tab"]:has-text("Relations")').first();
    const relationsLink = page.locator('a[href*="relations"]').first();

    if (await relationsTab.isVisible()) {
      console.log('Found Relations tab');
      await relationsTab.click();
      await page.waitForLoadState('domcontentloaded');
      await page.screenshot({ path: 'relations-tab.png' });
    } else if (await relationsLink.isVisible()) {
      console.log('Found Relations link');
      await relationsLink.click();
      await page.waitForLoadState('domcontentloaded');
    } else {
      console.log('No Relations tab/link found, trying direct URL');
      await page.goto('https://komuno.rbw.ovh/admin/members/relations', { waitUntil: 'domcontentloaded' });
      await page.screenshot({ path: 'relations-page.png' });
    }

    // Look for "Créer une relation" button
    const createRelationButton = page.locator('button:has-text("Créer une relation"), button:has-text("Create")').first();

    if (await createRelationButton.isVisible()) {
      console.log('Found "Créer une relation" button');
      await createRelationButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Take screenshot of relation dialog
      await page.screenshot({ path: 'create-relation-dialog.png' });

      // Look for multiple member search fields
      const searchFields = page.locator('input[placeholder*="member"], input[placeholder*="recherche"], input[placeholder*="select"]');
      const count = await searchFields.count();
      console.log(`Found ${count} search field(s) in relation form`);

      if (count > 0) {
        await page.screenshot({ path: 'relation-member-searches.png' });
      }
    }
  });
});
