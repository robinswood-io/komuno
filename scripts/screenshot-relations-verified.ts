import { chromium } from 'playwright';

async function takeVerifiedScreenshot() {
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
    await page.goto('https://cjd80.rbw.ovh/login', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');

    // Login avec les credentials de dev
    console.log('Connexion en tant qu\'admin...');
    await page.fill('input[type="email"]', 'admin@test.local');
    await page.fill('input[type="password"]', 'any-password');
    await page.click('button[type="submit"]');

    // Attendre la redirection
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    console.log('Authentification réussie');

    // Attendre un peu pour que la session soit bien établie
    await page.waitForTimeout(2000);

    // Naviguer vers la page Relations
    console.log('Navigation vers la page Relations...');
    await page.goto('https://cjd80.rbw.ovh/admin/members/member-graph', {
      timeout: 60000,
      waitUntil: 'domcontentloaded'
    });

    // Attendre que le contenu soit visible
    await page.waitForTimeout(5000);

    // Vérifier qu'on n'a pas une erreur Bad Gateway
    const bodyText = await page.textContent('body');
    if (bodyText?.includes('Bad Gateway')) {
      console.error('❌ Page montre "Bad Gateway"');
      await page.screenshot({
        path: '/tmp/relations-bad-gateway.png',
        fullPage: true,
      });
      throw new Error('Bad Gateway détecté');
    }

    // Vérifier que nous sommes bien sur la page Relations
    const url = page.url();
    console.log('URL actuelle:', url);

    if (!url.includes('/admin/members/member-graph')) {
      console.error('❌ Pas sur la bonne URL');
      throw new Error('Redirection inattendue');
    }

    // Prendre la capture d'écran pleine page
    console.log('Capture d\'écran pleine page en cours...');
    await page.screenshot({
      path: '/tmp/relations-full-verified.png',
      fullPage: true,
    });

    console.log('✅ Capture pleine page sauvegardée : /tmp/relations-full-verified.png');

    // Aussi prendre une capture de la vue visible
    await page.screenshot({
      path: '/tmp/relations-viewport-verified.png',
      fullPage: false,
    });

    console.log('✅ Capture viewport sauvegardée : /tmp/relations-viewport-verified.png');

    // Vérifier la taille des captures
    const fs = require('fs');
    const fullSize = fs.statSync('/tmp/relations-full-verified.png').size;
    const viewportSize = fs.statSync('/tmp/relations-viewport-verified.png').size;

    console.log(`Taille pleine page: ${(fullSize / 1024).toFixed(2)} KB`);
    console.log(`Taille viewport: ${(viewportSize / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Erreur:', error);

    // Prendre une capture d'écran de l'erreur
    try {
      await page.screenshot({
        path: '/tmp/relations-error-verified.png',
        fullPage: true,
      });
      console.log('Capture d\'erreur sauvegardée : /tmp/relations-error-verified.png');
    } catch (e) {
      console.error('Impossible de prendre la capture d\'erreur:', e);
    }

    throw error;
  } finally {
    await browser.close();
  }
}

takeVerifiedScreenshot().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
