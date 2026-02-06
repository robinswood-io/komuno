import { test, expect } from '@playwright/test';

test.describe('Branding - Debug couleurs', () => {
  test('vérifier que les couleurs CSS par défaut sont chargées', async ({ page }) => {
    await page.goto('https://cjd80.rbw.ovh');
    await page.waitForLoadState('networkidle');

    // Vérifier les variables CSS
    const cssVars = await page.evaluate(() => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);

      return {
        primary: computedStyle.getPropertyValue('--primary').trim(),
        secondary: computedStyle.getPropertyValue('--secondary').trim(),
        accent: computedStyle.getPropertyValue('--accent').trim(),
        accentForeground: computedStyle.getPropertyValue('--accent-foreground').trim(),
      };
    });

    console.log('Variables CSS actuelles:', JSON.stringify(cssVars, null, 2));

    // Les valeurs devraient être en format HSL
    expect(cssVars.primary).toMatch(/\d+\s+\d+%\s+\d+%/);
  });

  test('vérifier la fonction hexToHSL', async ({ page }) => {
    await page.goto('https://cjd80.rbw.ovh');

    // Injecter et tester la fonction de conversion
    const result = await page.evaluate(() => {
      const hexToHSL = (hex: string): string => {
        hex = hex.replace(/^#/, '');

        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }

        h = Math.round(h * 360);
        s = Math.round(s * 100);
        l = Math.round(l * 100);

        return `${h} ${s}% ${l}%`;
      };

      return {
        green: hexToHSL('#22c55e'),  // CJD green
        blue: hexToHSL('#3b82f6'),   // Test blue
        red: hexToHSL('#ef4444'),    // Test red
      };
    });

    console.log('Tests de conversion hexToHSL:', result);

    // Vérifier que la conversion fonctionne
    expect(result.green).toMatch(/\d+\s+\d+%\s+\d+%/);
    expect(result.blue).toMatch(/\d+\s+\d+%\s+\d+%/);
    expect(result.red).toMatch(/\d+\s+\d+%\s+\d+%/);
  });

  test('vérifier si BrandingContext est monté', async ({ page }) => {
    await page.goto('https://cjd80.rbw.ovh');
    await page.waitForLoadState('networkidle');

    // Vérifier dans la console si le BrandingContext applique les couleurs
    const logs: string[] = [];

    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    // Attendre un peu pour voir les logs
    await page.waitForTimeout(2000);

    console.log('Logs de la console:', logs);
  });

  test('tester application manuelle des couleurs CSS', async ({ page }) => {
    await page.goto('https://cjd80.rbw.ovh');
    await page.waitForLoadState('networkidle');

    // Récupérer la couleur primaire avant
    const colorBefore = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    console.log('Couleur AVANT modification:', colorBefore);

    // Appliquer manuellement une nouvelle couleur
    await page.evaluate(() => {
      const root = document.documentElement;
      root.style.setProperty('--primary', '11 100% 60%'); // Orange vif
    });

    // Wait a bit
    await page.waitForTimeout(500);

    // Vérifier que la couleur a changé
    const colorAfter = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    console.log('Couleur APRÈS modification:', colorAfter);

    expect(colorAfter).toBe('11 100% 60%');

    // Vérifier visuellement sur un élément
    const buttonColor = await page.evaluate(() => {
      const button = document.querySelector('button');
      if (!button) return null;
      return getComputedStyle(button).backgroundColor;
    });

    console.log('Couleur du bouton après modification CSS:', buttonColor);
  });
});
