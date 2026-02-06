import { chromium } from 'playwright';

async function takeScreenshot() {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    // Aller sur la page de login
    console.log('Navigation vers la page de login...');
    await page.goto('https://cjd80.rbw.ovh/login');
    await page.waitForLoadState('networkidle');

    // Login avec les credentials de dev
    console.log('Connexion en tant qu\'admin...');
    await page.fill('input[type="email"]', 'admin@test.local');
    await page.fill('input[type="password"]', 'any-password'); // Dev mode: password bypass
    await page.click('button[type="submit"]');

    // Attendre la redirection
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    console.log('Authentification réussie');

    // Naviguer vers la page Relations
    console.log('Navigation vers la page Relations...');
    await page.goto('https://cjd80.rbw.ovh/admin/members/member-graph');
    await page.waitForLoadState('networkidle');

    // Attendre que le contenu soit chargé
    await page.waitForTimeout(3000);

    // Prendre la capture d'écran
    console.log('Capture d\'écran en cours...');
    await page.screenshot({
      path: '/tmp/relations-page-full.png',
      fullPage: true,
    });

    console.log('✅ Capture d\'écran sauvegardée : /tmp/relations-page-full.png');

    // Aussi prendre une capture de la vue visible
    await page.screenshot({
      path: '/tmp/relations-page-viewport.png',
      fullPage: false,
    });

    console.log('✅ Capture viewport sauvegardée : /tmp/relations-page-viewport.png');
  } catch (error) {
    console.error('❌ Erreur:', error);

    // Prendre une capture d'écran de l'erreur
    await page.screenshot({
      path: '/tmp/relations-page-error.png',
      fullPage: true,
    });

    console.log('Capture d\'erreur sauvegardée : /tmp/relations-page-error.png');
  } finally {
    await browser.close();
  }
}

takeScreenshot();
