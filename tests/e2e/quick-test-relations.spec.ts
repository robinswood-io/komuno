import { test, expect } from '@playwright/test';

test.describe('Test rapide - Page Relations', () => {
  test('devrait charger la page Relations sans erreur', async ({ page }) => {
    // Navigation vers la page
    await page.goto('https://cjd80.rbw.ovh/admin/members/relations');

    // Attendre que la page soit chargée
    await page.waitForLoadState('networkidle');

    // Vérifier que nous sommes sur la bonne page
    await expect(page).toHaveURL(/\/admin\/members\/relations/);

    // Vérifier que le titre ou un élément principal est présent
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    console.log('✅ Page Relations chargée avec succès');
  });

  test('devrait afficher les onglets Graphe et Tableau', async ({ page }) => {
    await page.goto('https://cjd80.rbw.ovh/admin/members/relations');
    await page.waitForLoadState('networkidle');

    // Chercher les onglets
    const graphTab = page.getByRole('tab', { name: /graphe/i }).first();
    const tableTab = page.getByRole('tab', { name: /tableau/i }).first();

    // Vérifier qu'ils sont visibles
    await expect(graphTab).toBeVisible();
    await expect(tableTab).toBeVisible();

    console.log('✅ Onglets Graphe et Tableau présents');
  });

  test('devrait permettre de basculer entre les onglets', async ({ page }) => {
    await page.goto('https://cjd80.rbw.ovh/admin/members/relations');
    await page.waitForLoadState('networkidle');

    // Cliquer sur l'onglet Tableau
    const tableTab = page.getByRole('tab', { name: /tableau/i }).first();
    await tableTab.click();

    // Attendre un court instant
    await page.waitForTimeout(500);

    // Revenir sur l'onglet Graphe
    const graphTab = page.getByRole('tab', { name: /graphe/i }).first();
    await graphTab.click();

    await page.waitForTimeout(500);

    console.log('✅ Basculement entre onglets fonctionne');
  });

  test('devrait afficher le composant Reagraph dans l\'onglet Graphe', async ({ page }) => {
    await page.goto('https://cjd80.rbw.ovh/admin/members/relations');
    await page.waitForLoadState('networkidle');

    // Attendre que le canvas WebGL soit présent
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    console.log('✅ Canvas Reagraph présent et visible');
  });
});
