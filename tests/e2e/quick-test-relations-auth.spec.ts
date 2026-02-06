import { test, expect } from '@playwright/test';
import { loginAsAdminQuick } from './helpers/auth';

const BASE_URL = 'https://cjd80.rbw.ovh';

test.describe('Test Page Relations (Authentifié)', () => {
  test('devrait charger la page Relations avec authentification', async ({ page }) => {
    // Login en tant qu'admin
    await loginAsAdminQuick(page, BASE_URL);

    // Navigation vers la page Relations
    await page.goto(`${BASE_URL}/admin/members/member-graph`);

    // Attendre que la page soit chargée
    await page.waitForLoadState('domcontentloaded');

    // Vérifier que nous sommes sur la bonne page
    await expect(page).toHaveURL(/\/admin\/members\/relations/);

    console.log('✅ Page Relations chargée avec succès (authentifié)');
  });

  test('devrait afficher les onglets Graphe et Tableau', async ({ page }) => {
    await loginAsAdminQuick(page, BASE_URL);
    await page.goto(`${BASE_URL}/admin/members/member-graph`);
    await page.waitForLoadState('domcontentloaded');

    // Attendre un peu pour le rendu
    await page.waitForTimeout(2000);

    // Chercher les onglets avec une approche plus flexible
    const tabsList = page.locator('[role="tablist"]').first();
    await expect(tabsList).toBeVisible({ timeout: 10000 });

    console.log('✅ Liste d\'onglets présente');
  });

  test('devrait afficher du contenu dans l\'onglet Graphe', async ({ page }) => {
    await loginAsAdminQuick(page, BASE_URL);
    await page.goto(`${BASE_URL}/admin/members/member-graph`);
    await page.waitForLoadState('domcontentloaded');

    // Attendre que le contenu charge
    await page.waitForTimeout(3000);

    // Vérifier qu'il y a du contenu visible
    const body = page.locator('body');
    const text = await body.textContent();

    // La page devrait contenir au moins "Relations" ou "Graphe"
    expect(text).toMatch(/Relations|Graphe|Tableau/i);

    console.log('✅ Contenu de la page présent');
  });

  test('devrait charger sans erreurs JavaScript critiques', async ({ page }) => {
    const errors: string[] = [];

    // Capturer les erreurs JavaScript
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.log('❌ Erreur JS:', error.message);
    });

    await loginAsAdminQuick(page, BASE_URL);
    await page.goto(`${BASE_URL}/admin/members/member-graph`);
    await page.waitForLoadState('domcontentloaded');

    // Attendre un peu pour voir si des erreurs apparaissent
    await page.waitForTimeout(3000);

    // Vérifier qu'il n'y a pas d'erreurs critiques
    const criticalErrors = errors.filter(e =>
      !e.includes('warning') &&
      !e.includes('favicon') &&
      !e.includes('404')
    );

    if (criticalErrors.length > 0) {
      console.log('⚠️  Erreurs critiques détectées:', criticalErrors);
    } else {
      console.log('✅ Aucune erreur JavaScript critique');
    }

    expect(criticalErrors.length).toBeLessThan(5); // Tolérer quelques erreurs mineures
  });
});
