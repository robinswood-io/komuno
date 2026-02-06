import { test, expect } from '@playwright/test';

test.describe('Branding - Application des couleurs', () => {
  test.beforeEach(async ({ page }) => {
    // Mock session utilisateur
    await page.addInitScript(() => {
      // Simuler une session avec cookies
      document.cookie = 'connect.sid=mock-session-id; path=/';
    });

    // Mock de la requête d'authentification
    await page.route('**/api/auth/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-admin',
          email: 'admin@test.com',
          role: 'super_admin',
          isActive: true
        })
      });
    });

    // Mock de la requête GET branding (chargement initial)
    await page.route('**/api/admin/branding', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              isDefault: true,
              config: null
            }
          })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('devrait appliquer les couleurs personnalisées aux variables CSS', async ({ page }) => {
    // Aller sur la page branding
    await page.goto('https://cjd80.rbw.ovh/admin/branding');
    await page.waitForLoadState('networkidle');

    // Ouvrir la section Apparence
    await page.click('[data-testid="accordion-trigger-appearance"]');
    await page.waitForTimeout(500);

    // Récupérer la couleur CSS primaire actuelle
    const initialPrimaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    console.log('Couleur primaire initiale:', initialPrimaryColor);

    // Changer la couleur primaire
    const newColor = '#ff5733'; // Orange vif
    await page.fill('[data-testid="input-color-primary"]', newColor);

    // Attendre un peu pour voir si la couleur change en temps réel (sans sauvegarder)
    await page.waitForTimeout(1000);

    // Vérifier que la couleur n'a PAS changé (car pas encore sauvegardé)
    const colorBeforeSave = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    console.log('Couleur avant sauvegarde:', colorBeforeSave);
    expect(colorBeforeSave).toBe(initialPrimaryColor);

    // Sauvegarder
    await page.click('[data-testid="button-save-branding"]');

    // Attendre le toast de confirmation
    await expect(page.getByText(/sauvegardé avec succès/i).first()).toBeVisible({ timeout: 5000 });

    // Attendre que le rechargement du branding se termine
    await page.waitForTimeout(2000);

    // Vérifier que la couleur CSS a changé
    const colorAfterSave = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    console.log('Couleur après sauvegarde:', colorAfterSave);

    // Convertir #ff5733 en HSL pour comparaison
    // #ff5733 = rgb(255, 87, 51) = hsl(11, 100%, 60%)
    // Le format attendu est "11 100% 60%"

    // Vérifier que la couleur a changé (pas égale à la couleur initiale)
    expect(colorAfterSave).not.toBe(initialPrimaryColor);

    // Vérifier que la nouvelle couleur contient des valeurs HSL cohérentes avec orange
    // HSL pour #ff5733 est environ: 11° 100% 60%
    const hslMatch = colorAfterSave.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    expect(hslMatch).toBeTruthy();

    if (hslMatch) {
      const [, h, s, l] = hslMatch.map(Number);
      // Vérifier que c'est bien dans la zone orange/rouge (hue entre 0-30)
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(30);
      // Vérifier saturation élevée (orange vif)
      expect(s).toBeGreaterThan(80);
    }

    // Vérifier visuellement qu'un bouton a la nouvelle couleur
    const button = page.locator('[data-testid="button-save-branding"]');
    const buttonBgColor = await button.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });

    console.log('Couleur de fond du bouton:', buttonBgColor);

    // Le bouton devrait avoir une couleur différente de vert
    // RGB du vert CJD original: rgb(34, 197, 94)
    expect(buttonBgColor).not.toBe('rgb(34, 197, 94)');
  });

  test('devrait appliquer toutes les couleurs (primaire, sombre, claire, secondaire)', async ({ page }) => {
    await page.goto('https://cjd80.rbw.ovh/admin/branding');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="accordion-trigger-appearance"]');
    await page.waitForTimeout(500);

    // Changer toutes les couleurs
    const colors = {
      primary: '#3b82f6',      // Bleu
      primaryDark: '#1e40af',  // Bleu foncé
      primaryLight: '#93c5fd', // Bleu clair
      secondary: '#ec4899',    // Rose
    };

    await page.fill('[data-testid="input-color-primary"]', colors.primary);
    await page.fill('[data-testid="input-color-primary-dark"]', colors.primaryDark);
    await page.fill('[data-testid="input-color-primary-light"]', colors.primaryLight);
    await page.fill('[data-testid="input-color-secondary"]', colors.secondary);

    // Sauvegarder
    await page.click('[data-testid="button-save-branding"]');
    await expect(page.getByText(/sauvegardé avec succès/i).first()).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);

    // Vérifier toutes les variables CSS
    const cssVars = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        primary: getComputedStyle(root).getPropertyValue('--primary').trim(),
        accentForeground: getComputedStyle(root).getPropertyValue('--accent-foreground').trim(),
        accent: getComputedStyle(root).getPropertyValue('--accent').trim(),
        secondary: getComputedStyle(root).getPropertyValue('--secondary').trim(),
      };
    });

    console.log('Variables CSS après sauvegarde:', cssVars);

    // Vérifier que toutes les variables ont des valeurs HSL
    expect(cssVars.primary).toMatch(/\d+\s+\d+%\s+\d+%/);
    expect(cssVars.accentForeground).toMatch(/\d+\s+\d+%\s+\d+%/);
    expect(cssVars.accent).toMatch(/\d+\s+\d+%\s+\d+%/);
    expect(cssVars.secondary).toMatch(/\d+\s+\d+%\s+\d+%/);
  });

  test('devrait réinitialiser les couleurs par défaut', async ({ page }) => {
    await page.goto('https://cjd80.rbw.ovh/admin/branding');
    await page.waitForLoadState('networkidle');

    // Cliquer sur Réinitialiser
    await page.click('[data-testid="button-reset-branding"]');

    // Confirmer
    await page.click('[data-testid="button-confirm-reset-branding"]');

    // Attendre le toast
    await expect(page.getByText(/réinitialisée/i).first()).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);

    // Vérifier que les couleurs sont revenues au vert CJD
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    console.log('Couleur primaire après reset:', primaryColor);

    // Le vert CJD est #22c55e = hsl(140, 69%, 33%)
    const hslMatch = primaryColor.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    expect(hslMatch).toBeTruthy();

    if (hslMatch) {
      const [, h, s, l] = hslMatch.map(Number);
      // Vérifier que c'est dans la zone verte (hue 120-150)
      expect(h).toBeGreaterThanOrEqual(120);
      expect(h).toBeLessThanOrEqual(150);
    }
  });

  test('devrait appliquer les couleurs immédiatement lors du chargement de la page', async ({ page }) => {
    // D'abord, définir une couleur personnalisée
    await page.goto('https://cjd80.rbw.ovh/admin/branding');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="accordion-trigger-appearance"]');
    await page.fill('[data-testid="input-color-primary"]', '#9333ea'); // Violet
    await page.click('[data-testid="button-save-branding"]');
    await expect(page.getByText(/sauvegardé/i).first()).toBeVisible({ timeout: 5000 });

    // Recharger complètement la page
    await page.goto('https://cjd80.rbw.ovh/admin');
    await page.waitForLoadState('networkidle');

    // Vérifier que la couleur violette est appliquée
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    console.log('Couleur primaire après rechargement:', primaryColor);

    // Vérifier que c'est violet (hue 270-300)
    const hslMatch = primaryColor.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    expect(hslMatch).toBeTruthy();

    if (hslMatch) {
      const [, h] = hslMatch.map(Number);
      expect(h).toBeGreaterThanOrEqual(250);
      expect(h).toBeLessThanOrEqual(310);
    }
  });
});
