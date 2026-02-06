import { chromium } from 'playwright';

async function testLoginPage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    console.log('📄 Navigation vers la page de login...');
    await page.goto('https://cjd80.rbw.ovh/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Vérifier que le formulaire est visible
    const emailInput = await page.locator('input[type="email"]').isVisible();
    const passwordInput = await page.locator('input[type="password"]').isVisible();
    const submitButton = await page.locator('button[type="submit"]').isVisible();

    console.log('\n✅ Éléments du formulaire:');
    console.log(`   - Champ email: ${emailInput ? '✓ Visible' : '✗ Non visible'}`);
    console.log(`   - Champ mot de passe: ${passwordInput ? '✓ Visible' : '✗ Non visible'}`);
    console.log(`   - Bouton connexion: ${submitButton ? '✓ Visible' : '✗ Non visible'}`);

    // Vérifier qu'il n'y a pas de mention d'Authentik
    const bodyText = await page.textContent('body');
    const hasAuthentik = bodyText?.includes('Authentik');

    console.log(`\n🔍 Vérification Authentik:`);
    console.log(`   - Mentions "Authentik": ${hasAuthentik ? '✗ Trouvé (PROBLÈME!)' : '✓ Aucune'}`);

    // Prendre une capture d'écran
    await page.screenshot({
      path: '/tmp/login-page-test.png',
      fullPage: true,
    });

    console.log('\n📸 Capture d\'écran sauvegardée: /tmp/login-page-test.png');

    if (emailInput && passwordInput && submitButton && !hasAuthentik) {
      console.log('\n✅ Page de login OK - Formulaire visible, pas d\'Authentik');
    } else {
      console.log('\n⚠️  Problèmes détectés sur la page de login');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await browser.close();
  }
}

testLoginPage();
