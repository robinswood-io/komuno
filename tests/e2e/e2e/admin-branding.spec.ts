import { test, expect } from '@playwright/test';

test.describe('Admin Branding Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Mock SUPER_ADMIN auth (role is super_admin not SUPER_ADMIN based on code)
    await page.addInitScript(() => {
      window.localStorage.setItem('admin-user', JSON.stringify({
        id: 'superadmin',
        email: 'superadmin@test.com',
        role: 'super_admin'
      }));
    });
    
    await page.goto('/admin/branding');
  });
  
  test('should display branding configuration form with all sections', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Vérifier que les 5 sections Accordion sont présentes
    await expect(page.locator('[data-testid="accordion-trigger-app"]')).toBeVisible();
    await expect(page.locator('[data-testid="accordion-trigger-organization"]')).toBeVisible();
    await expect(page.locator('[data-testid="accordion-trigger-appearance"]')).toBeVisible();
    // PWA section is in the form
    await expect(page.locator('[data-testid="accordion-pwa"]')).toBeVisible();
    // Links section
    await expect(page.locator('[data-testid="accordion-links"]')).toBeVisible();
  });
  
  test('should display badge status (Personnalisé/Par défaut)', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Vérifier présence du badge de statut
    const statusBadge = page.locator('[data-testid="badge-branding-status"]');
    await expect(statusBadge).toBeVisible();
    
    // Le badge devrait afficher "Par défaut" ou "Personnalisé"
    const badgeText = await statusBadge.textContent();
    expect(['Par défaut', 'Personnalisé']).toContain(badgeText?.trim());
  });
  
  test('should allow editing app name', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // La section Application est déjà ouverte par défaut (defaultValue="app")
    // Modifier le nom de l'app
    const appNameInput = page.locator('[data-testid="input-app-name"]');
    await appNameInput.fill('Test App Name Updated');
    
    // Mock the save request
    await page.route('/api/admin/branding', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.continue();
      }
    });
    
    // Sauvegarder
    await page.click('[data-testid="button-save-branding"]');
    
    // Vérifier succès (toast message)
    await expect(page.getByText('Branding sauvegardé avec succès').first()).toBeVisible({ timeout: 3000 });
  });
  
  test('should allow color picker for primary color', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Ouvrir section Apparence
    await page.click('[data-testid="accordion-trigger-appearance"]');
    
    // Tester le color picker (input type color)
    const colorInput = page.locator('[data-testid="input-color-primary"]');
    await colorInput.fill('#FF5733');
    
    // Mock save request
    await page.route('/api/admin/branding', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.continue();
      }
    });
    
    await page.click('[data-testid="button-save-branding"]');
    await expect(page.getByText('Branding sauvegardé avec succès').first()).toBeVisible({ timeout: 3000 });
  });
  
  test('should reset to default configuration', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Mock the DELETE request for reset
    await page.route('/api/admin/branding', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.continue();
      }
    });
    
    await page.click('[data-testid="button-reset-branding"]');
    
    // Confirmer dans AlertDialog
    await page.click('[data-testid="button-confirm-reset-branding"]');
    
    // Vérifier reset
    await expect(page.getByText('Configuration réinitialisée aux valeurs par défaut').first()).toBeVisible({ timeout: 3000 });
  });

  test('should show all form fields in Application section', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Application section is open by default
    await expect(page.locator('[data-testid="input-app-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-app-short-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-app-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-app-idea-box-name"]')).toBeVisible();
  });

  test('should show all form fields in Organisation section', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Open Organisation section
    await page.click('[data-testid="accordion-trigger-organization"]');
    
    await expect(page.locator('[data-testid="input-org-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-org-full-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-org-tagline"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-org-url"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-org-email"]')).toBeVisible();
  });

  test('should show color inputs in Appearance section', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Open Apparence section
    await page.click('[data-testid="accordion-trigger-appearance"]');
    
    // Check for color inputs
    await expect(page.locator('[data-testid="input-color-primary"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-color-primary-dark"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-color-primary-light"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-color-secondary"]')).toBeVisible();
  });

  test('should handle save errors gracefully', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Mock a failed save request
    await page.route('/api/admin/branding', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      } else {
        await route.continue();
      }
    });
    
    // Try to save
    await page.click('[data-testid="button-save-branding"]');
    
    // Should show error toast
    await expect(page.getByText('Erreur').first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Admin Branding Access Control', () => {
  test('should deny access to non-super-admin users', async ({ page }) => {
    // Mock regular ADMIN (not super_admin)
    await page.addInitScript(() => {
      window.localStorage.setItem('admin-user', JSON.stringify({
        id: 'admin',
        email: 'admin@test.com',
        role: 'admin'
      }));
    });
    
    await page.goto('/admin/branding');
    await page.waitForLoadState('networkidle');
    
    // Should show access denied message
    await expect(page.locator('text=Accès refusé')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Cette page est réservée aux super-administrateurs uniquement')).toBeVisible();
    
    // Should have back button
    await expect(page.locator('[data-testid="button-back-admin"]')).toBeVisible();
  });
});
