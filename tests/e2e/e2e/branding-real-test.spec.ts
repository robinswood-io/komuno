import { test, expect } from '@playwright/test';

test.describe('Branding - Test réel sur le site', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avec un compte super admin réel
    await page.goto('https://cjd80.rbw.ovh/admin/login');

    // Remplir le formulaire (adapter selon les vrais identifiants)
    await page.fill('[name="email"]', 'cedric@robinswood.io');
    await page.fill('[name="password"]', 'superadmin');
    await page.click('button[type="submit"]');

    // Attendre la redirection
    await page.waitForURL('**/admin**', { timeout: 10000 });
  });

  test('changer la couleur primaire et vérifier application', async ({ page }) => {
    // Aller sur branding
    await page.goto('https://cjd80.rbw.ovh/admin/branding');
    await page.waitForLoadState('networkidle');

    // Ouvrir section Apparence
    await page.click('[data-testid="accordion-trigger-appearance"]');
    await page.waitForTimeout(500);

    // Vérifier couleur CSS actuelle
    const colorBefore = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });
    console.log('Couleur primaire AVANT:', colorBefore);

    // Changer la couleur pour violet
    await page.fill('[data-testid="input-color-primary"]', '#9333ea');
    await page.waitForTimeout(500);

    // Sauvegarder
    await page.click('[data-testid="button-save-branding"]');

    // Attendre le toast
    await page.waitForSelector('text=/sauvegardé/i', { timeout: 5000 });
    await page.waitForTimeout(2000); // Attendre le reload

    // Vérifier couleur CSS après sauvegarde
    const colorAfter = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });
    console.log('Couleur primaire APRÈS:', colorAfter);

    // Screenshot pour debug
    await page.screenshot({ path: '/tmp/branding-after-save.png' });

    // Vérifier que la couleur a changé
    expect(colorAfter).not.toBe(colorBefore);

    // Vérifier que c'est dans la zone violette (hue 270-300)
    const hslMatch = colorAfter.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    if (hslMatch) {
      const [, h] = hslMatch.map(Number);
      console.log('Hue de la nouvelle couleur:', h);
      expect(h).toBeGreaterThanOrEqual(250);
      expect(h).toBeLessThanOrEqual(310);
    }

    // Nettoyer : réinitialiser aux couleurs par défaut
    await page.click('[data-testid="button-reset-branding"]');
    await page.click('[data-testid="button-confirm-reset-branding"]');
    await page.waitForSelector('text=/réinitialisée/i', { timeout: 5000 });
  });
});
