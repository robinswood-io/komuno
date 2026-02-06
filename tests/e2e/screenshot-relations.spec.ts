import { test } from '@playwright/test';
import { loginAsAdminQuick } from './helpers/auth';

const BASE_URL = 'https://cjd80.rbw.ovh';

test('Capture écran page Relations', async ({ page }) => {
  // Login en tant qu'admin
  await loginAsAdminQuick(page, BASE_URL);

  // Navigation vers la page Relations
  await page.goto(`${BASE_URL}/admin/members/member-graph`);

  // Attendre que la page soit complètement chargée
  await page.waitForLoadState('networkidle');

  // Attendre un peu pour que tout soit rendu
  await page.waitForTimeout(3000);

  // Prendre une capture d'écran pleine page
  await page.screenshot({
    path: '/tmp/relations-page-screenshot.png',
    fullPage: true,
  });

  console.log('✅ Capture d\'écran sauvegardée dans /tmp/relations-page-screenshot.png');
});
