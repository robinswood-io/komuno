import { chromium } from 'playwright';

async function debugRelationsPage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  // Capturer les erreurs console
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  const errors: string[] = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    // Login
    console.log('Login...');
    await page.goto('https://cjd80.rbw.ovh/login');
    await page.fill('input[type="email"]', 'admin@test.local');
    await page.fill('input[type="password"]', 'any-password');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    // Navigate to Relations
    console.log('Navigation vers Relations...');
    await page.goto('https://cjd80.rbw.ovh/admin/members/member-graph', {
      timeout: 60000,
      waitUntil: 'domcontentloaded'
    });

    await page.waitForTimeout(5000);

    // Vérifier la structure DOM
    const bodyHTML = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) {
        return {
          hasMain: true,
          mainClasses: main.className,
          mainHTML: main.innerHTML.substring(0, 1000), // Premier 1000 chars
          children: Array.from(main.children).map(el => ({
            tag: el.tagName,
            classes: el.className,
            id: el.id,
          })),
        };
      }
      return { hasMain: false };
    });

    console.log('\n=== STRUCTURE DOM ===');
    console.log(JSON.stringify(bodyHTML, null, 2));

    // Vérifier si le sidebar est présent
    const hasSidebar = await page.evaluate(() => {
      return !!document.querySelector('aside') || !!document.querySelector('[role="navigation"]');
    });

    console.log('\n=== SIDEBAR ===');
    console.log('Sidebar présent:', hasSidebar);

    // Vérifier les onglets
    const hasTabs = await page.evaluate(() => {
      return !!document.querySelector('[role="tablist"]');
    });

    console.log('\n=== TABS ===');
    console.log('Tabs présent:', hasTabs);

    // Vérifier le canvas Reagraph
    const hasCanvas = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        return {
          present: true,
          width: canvas.width,
          height: canvas.height,
          style: canvas.style.cssText,
        };
      }
      return { present: false };
    });

    console.log('\n=== CANVAS REAGRAPH ===');
    console.log(JSON.stringify(hasCanvas, null, 2));

    // Console messages
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => console.log(msg));

    // Erreurs
    console.log('\n=== ERRORS ===');
    if (errors.length > 0) {
      errors.forEach(err => console.log('❌', err));
    } else {
      console.log('✅ Aucune erreur');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await browser.close();
  }
}

debugRelationsPage();
