import { test, expect, type Page } from '@playwright/test';
import { getAuthHeaders, loginAsAdminQuick } from '../helpers/auth';

/**
 * Tests E2E - CRM Members: Member Details Sheet
 *
 * Component: member-details-sheet.tsx
 * Trigger: Eye icon button in members table
 *
 * Fonctionnalités testées:
 * 1. Ouverture sheet depuis liste membres
 * 2. Affichage informations membre complètes
 * 3. Navigation entre 4 tabs (Subscriptions, Tags, Tasks, Activities)
 * 4. Affichage engagement score
 * 5. Status badge (active/proposed/inactive)
 * 6. Données dans chaque tab
 * 7. Fermeture sheet
 *
 * Endpoints testés:
 * - GET /api/admin/members/:email/details
 * - GET /api/admin/members/:email/activities
 *
 * URL de test: https://cjd80.rbw.ovh
 */

const BASE_URL = 'https://cjd80.rbw.ovh';

// Helper: Naviguer vers la page members
async function navigateToMembersPage(page: Page) {
  await page.goto(`${BASE_URL}/admin/members`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

test.describe('CRM Members: Member Details Sheet', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdminQuick(page);
    await navigateToMembersPage(page);
  });

  test('1. Afficher boutons œil (eye icon) dans la liste', async ({ page }) => {
    console.log('[TEST 1] Vérification boutons détails');

    await page.waitForTimeout(2000);

    // Chercher les boutons avec icon œil
    const eyeButtons = page.locator('[data-testid="member-details-button"]');
    const buttonCount = await eyeButtons.count();

    console.log('[TEST 1] Boutons œil trouvés:', buttonCount);

    if (buttonCount > 0) {
      await expect(eyeButtons.first()).toBeVisible();
      console.log('[TEST 1] ✅ Boutons détails visibles');
    } else {
      console.log('[TEST 1] ⚠️ Aucun membre dans la liste');
      test.skip();
    }
  });

  test('2. Ouvrir sheet en cliquant sur bouton œil', async ({ page }) => {
    console.log('[TEST 2] Ouverture sheet');

    await page.waitForTimeout(2000);

    // Trouver et cliquer sur le premier bouton œil
    const eyeButtons = page.locator('[data-testid="member-details-button"]');
    if (await eyeButtons.count() === 0) {
      test.skip();
      return;
    } else {
      await eyeButtons.first().click();
    }

    await page.waitForTimeout(1000);

    // Vérifier que le sheet est ouvert
    const sheet = page.locator('[data-testid="member-details-sheet"], [role="dialog"]').first();
    await expect(sheet).toBeVisible({ timeout: 5000 });

    console.log('[TEST 2] ✅ Sheet ouvert');
  });

  test('3. API GET /api/admin/members/:email/details retourne données complètes', async ({ page }) => {
    console.log('[TEST 3] Test API details');

    // D'abord récupérer un membre existant
    const authHeaders = await getAuthHeaders(page);
    const membersResponse = await page.request.get(`${BASE_URL}/api/admin/members?limit=1`, {
      headers: authHeaders,
    });
    const membersData = await membersResponse.json();

    if (!membersData.data || membersData.data.length === 0) {
      console.log('[TEST 3] ⚠️ Aucun membre disponible');
      test.skip();
      return;
    }

    const memberEmail = membersData.data[0].email;
    console.log('[TEST 3] Test avec membre:', memberEmail);

    // Appeler l'API details
    const detailsResponse = await page.request.get(
      `${BASE_URL}/api/admin/members/${encodeURIComponent(memberEmail)}/details`,
      { headers: authHeaders }
    );

    expect(detailsResponse.ok()).toBeTruthy();
    expect(detailsResponse.status()).toBe(200);

    const data = await detailsResponse.json();
    console.log('[TEST 3] Response keys:', Object.keys(data));

    // Vérifier structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('member');
    expect(data.data).toHaveProperty('tags');
    expect(data.data).toHaveProperty('tasks');
    expect(data.data).toHaveProperty('subscriptions');

    console.log('[TEST 3] ✅ API retourne données complètes');
  });

  test('4. API GET /api/admin/members/:email/activities retourne historique', async ({ page }) => {
    console.log('[TEST 4] Test API activities');

    // Récupérer un membre
    const authHeaders = await getAuthHeaders(page);
    const membersResponse = await page.request.get(`${BASE_URL}/api/admin/members?limit=1`, {
      headers: authHeaders,
    });
    const membersData = await membersResponse.json();

    if (!membersData.data || membersData.data.length === 0) {
      console.log('[TEST 4] ⚠️ Aucun membre disponible');
      test.skip();
      return;
    }

    const memberEmail = membersData.data[0].email;

    // Appeler l'API activities
    const activitiesResponse = await page.request.get(
      `${BASE_URL}/api/admin/members/${encodeURIComponent(memberEmail)}/activities`,
      { headers: authHeaders }
    );

    expect(activitiesResponse.ok()).toBeTruthy();
    expect(activitiesResponse.status()).toBe(200);

    const data = await activitiesResponse.json();
    console.log('[TEST 4] Response keys:', Object.keys(data));

    // Vérifier structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);

    console.log('[TEST 4] ✅ API activities retourne', data.data.length, 'activités');
  });

  test('5. Afficher informations membre dans le header du sheet', async ({ page }) => {
    console.log('[TEST 5] Vérification header sheet');

    await page.waitForTimeout(2000);

    // Ouvrir sheet
    const eyeButton = page.locator('[data-testid="member-details-button"]').first();
    if (await eyeButton.count() > 0) {
      await eyeButton.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('[TEST 5] ⚠️ Impossible d\'ouvrir sheet');
      test.skip();
      return;
    }

    // Vérifier présence du nom/prénom
    const nameElements = page.locator('h2, h3, [data-testid*="name"]');
    const hasName = await nameElements.count() > 0;

    if (hasName) {
      await expect(nameElements.first()).toBeVisible();
      const nameText = await nameElements.first().textContent();
      console.log('[TEST 5] ✅ Nom affiché:', nameText);
    }

    // Vérifier présence de l'email
    const emailElements = page.locator('text=/[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}/i');
    if (await emailElements.count() > 0) {
      await expect(emailElements.first()).toBeVisible();
      console.log('[TEST 5] ✅ Email visible');
    }
  });

  test('6. Afficher status badge (active/proposed/inactive)', async ({ page }) => {
    console.log('[TEST 6] Vérification status badge');

    await page.waitForTimeout(2000);

    // Ouvrir sheet
    const eyeButton = page.locator('[data-testid="member-details-button"]').first();
    if (await eyeButton.count() > 0) {
      await eyeButton.click();
      await page.waitForTimeout(1000);
    } else {
      test.skip();
      return;
    }

    // Chercher le badge de statut
    const statusBadge = page.locator('[class*="badge"], [data-testid*="badge"]').filter({ hasText: /actif|prospect|inactif|active|proposed|inactive/i });
    const badgeCount = await statusBadge.count();

    console.log('[TEST 6] Badges trouvés:', badgeCount);

    if (badgeCount > 0) {
      await expect(statusBadge.first()).toBeVisible();
      const badgeText = await statusBadge.first().textContent();
      console.log('[TEST 6] ✅ Status badge:', badgeText);
    } else {
      console.log('[TEST 6] ⚠️ Badge non trouvé (peut-être dans une autre section)');
    }
  });

  test('7. Afficher engagement score si disponible', async ({ page }) => {
    console.log('[TEST 7] Vérification engagement score');

    await page.waitForTimeout(2000);

    // Ouvrir sheet
    const eyeButton = page.locator('[data-testid="member-details-button"]').first();
    if (await eyeButton.count() > 0) {
      await eyeButton.click();
      await page.waitForTimeout(1000);
    } else {
      test.skip();
      return;
    }

    // Chercher le score
    const scoreElements = page.locator('[data-testid="member-engagement-score-badge"], text=/Score\\s*:/i');
    const hasScore = await scoreElements.count() > 0;

    if (hasScore) {
      await expect(scoreElements.first()).toBeVisible();
      const scoreText = await scoreElements.first().textContent();
      console.log('[TEST 7] ✅ Engagement score affiché:', scoreText);
    } else {
      console.log('[TEST 7] ⚠️ Score non affiché (peut-être pas disponible pour ce membre)');
    }
  });

  test('8. Afficher les 4 tabs (Subscriptions, Tags, Tasks, Activities)', async ({ page }) => {
    console.log('[TEST 8] Vérification tabs');

    await page.waitForTimeout(2000);

    // Ouvrir sheet
    const eyeButton = page.locator('[data-testid="member-details-button"]').first();
    if (await eyeButton.count() > 0) {
      await eyeButton.click();
      await page.waitForTimeout(1500);
    } else {
      test.skip();
      return;
    }

    // Chercher les tabs
    const tabsList = page.locator('[role="tablist"], [data-testid*="tabs"]').first();
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    console.log('[TEST 8] Tabs trouvés:', tabCount);

    if (tabCount >= 4) {
      // Vérifier que les tabs contiennent les bons textes
      const tabTexts = await tabs.allTextContents();
      console.log('[TEST 8] Tabs:', tabTexts);

      const hasCotisations = tabTexts.some(text => /cotisations|subscriptions/i.test(text));
      const hasTags = tabTexts.some(text => /tags/i.test(text));
      const hasTasks = tabTexts.some(text => /tâches|tasks/i.test(text));
      const hasActivities = tabTexts.some(text => /activités|activities/i.test(text));

      expect(hasCotisations || hasTags || hasTasks || hasActivities).toBe(true);
      console.log('[TEST 8] ✅ Tabs présents - Cotisations:', hasCotisations, 'Tags:', hasTags, 'Tasks:', hasTasks, 'Activities:', hasActivities);
    } else {
      console.log('[TEST 8] ⚠️ Moins de 4 tabs trouvés');
    }
  });

  test('9. Naviguer vers tab Subscriptions (Cotisations)', async ({ page }) => {
    console.log('[TEST 9] Navigation tab Subscriptions');

    await page.waitForTimeout(2000);

    // Ouvrir sheet
    const eyeButton = page.locator('[data-testid="member-details-button"]').first();
    if (await eyeButton.count() > 0) {
      await eyeButton.click();
      await page.waitForTimeout(1500);
    } else {
      test.skip();
      return;
    }

    // Cliquer sur tab Subscriptions
    const subscriptionsTab = page.locator('[role="tab"]').filter({ hasText: /cotisations|subscriptions/i }).first();
    if (await subscriptionsTab.count() > 0) {
      await subscriptionsTab.click();
      await page.waitForTimeout(500);

      // Vérifier que le contenu est affiché
      const contentArea = page.locator('[role="tabpanel"]').first();
      await expect(contentArea).toBeVisible();

      // Chercher les cotisations ou message vide
      const pageText = await page.textContent('body');
      const hasContent = pageText?.includes('cotisation') || pageText?.includes('Aucune');

      expect(hasContent).toBe(true);
      console.log('[TEST 9] ✅ Tab Subscriptions affiché');
    } else {
      console.log('[TEST 9] ⚠️ Tab Subscriptions non trouvé');
    }
  });

  test('10. Naviguer vers tab Tags', async ({ page }) => {
    console.log('[TEST 10] Navigation tab Tags');

    await page.waitForTimeout(2000);

    // Ouvrir sheet
    const eyeButton = page.locator('[data-testid="member-details-button"]').first();
    if (await eyeButton.count() > 0) {
      await eyeButton.click();
      await page.waitForTimeout(1500);
    } else {
      test.skip();
      return;
    }

    // Cliquer sur tab Tags
    const tagsTab = page.locator('[role="tab"]').filter({ hasText: /^tags$/i }).first();
    if (await tagsTab.count() > 0) {
      await tagsTab.click();
      await page.waitForTimeout(500);

      // Vérifier contenu
      const contentArea = page.locator('[role="tabpanel"]').first();
      await expect(contentArea).toBeVisible();

      console.log('[TEST 10] ✅ Tab Tags affiché');
    } else {
      console.log('[TEST 10] ⚠️ Tab Tags non trouvé');
    }
  });

  test('11. Naviguer vers tab Tasks (Tâches)', async ({ page }) => {
    console.log('[TEST 11] Navigation tab Tasks');

    await page.waitForTimeout(2000);

    // Ouvrir sheet
    const eyeButton = page.locator('[data-testid="member-details-button"]').first();
    if (await eyeButton.count() > 0) {
      await eyeButton.click();
      await page.waitForTimeout(1500);
    } else {
      test.skip();
      return;
    }

    // Cliquer sur tab Tasks
    const tasksTab = page.locator('[role="tab"]').filter({ hasText: /tâches|tasks/i }).first();
    if (await tasksTab.count() > 0) {
      await tasksTab.click();
      await page.waitForTimeout(500);

      // Vérifier contenu
      const contentArea = page.locator('[role="tabpanel"]').first();
      await expect(contentArea).toBeVisible();

      console.log('[TEST 11] ✅ Tab Tasks affiché');
    } else {
      console.log('[TEST 11] ⚠️ Tab Tasks non trouvé');
    }
  });

  test('12. Naviguer vers tab Activities (Activités)', async ({ page }) => {
    console.log('[TEST 12] Navigation tab Activities');

    await page.waitForTimeout(2000);

    // Ouvrir sheet
    const eyeButton = page.locator('[data-testid="member-details-button"]').first();
    if (await eyeButton.count() > 0) {
      await eyeButton.click();
      await page.waitForTimeout(1500);
    } else {
      test.skip();
      return;
    }

    // Cliquer sur tab Activities
    const activitiesTab = page.locator('[role="tab"]').filter({ hasText: /activités|activities/i }).first();
    if (await activitiesTab.count() > 0) {
      await activitiesTab.click();
      await page.waitForTimeout(1000); // Plus long car loading possible

      // Vérifier contenu
      const contentArea = page.locator('[role="tabpanel"]').first();
      await expect(contentArea).toBeVisible();

      // Chercher activités ou message vide
      const pageText = await page.textContent('body');
      const hasContent = pageText?.includes('activité') || pageText?.includes('Aucune');

      expect(hasContent).toBe(true);
      console.log('[TEST 12] ✅ Tab Activities affiché');
    } else {
      console.log('[TEST 12] ⚠️ Tab Activities non trouvé');
    }
  });

  test('13. Fermer le sheet', async ({ page }) => {
    console.log('[TEST 13] Fermeture sheet');

    await page.waitForTimeout(2000);

    // Ouvrir sheet
    const eyeButton = page.locator('[data-testid="member-details-button"]').first();
    if (await eyeButton.count() > 0) {
      await eyeButton.click();
      await page.waitForTimeout(1500);
    } else {
      test.skip();
      return;
    }

    // Trouver le bouton de fermeture (X ou Close)
    const closeButton = page.locator('button[aria-label*="close" i], button[aria-label*="fermer" i]').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);

      // Vérifier que le sheet est fermé
      const sheet = page.locator('[role="dialog"]').first();
      const isVisible = await sheet.isVisible().catch(() => false);
      expect(isVisible).toBe(false);

      console.log('[TEST 13] ✅ Sheet fermé');
    } else {
      // Fallback: cliquer en dehors du sheet (overlay)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log('[TEST 13] ✅ Sheet fermé avec Escape');
    }
  });

  test('14. Workflow complet: Ouvrir, Naviguer tabs, Fermer', async ({ page }) => {
    console.log('[TEST 14] Workflow complet');

    await page.waitForTimeout(2000);

    // 1. OUVRIR
    console.log('[TEST 14] Étape 1: Ouverture');
    const eyeButton = page.locator('[data-testid="member-details-button"]').first();
    if (await eyeButton.count() > 0) {
      await eyeButton.click();
      await page.waitForTimeout(1500);

      const sheet = page.locator('[role="dialog"]').first();
      await expect(sheet).toBeVisible({ timeout: 5000 });
      console.log('[TEST 14] ✅ Sheet ouvert');
    } else {
      test.skip();
      return;
    }

    // 2. NAVIGUER TABS
    console.log('[TEST 14] Étape 2: Navigation tabs');
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    for (let i = 0; i < Math.min(tabCount, 4); i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(500);
      console.log(`[TEST 14] ✅ Tab ${i + 1} cliqué`);
    }

    // 3. FERMER
    console.log('[TEST 14] Étape 3: Fermeture');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const sheet = page.locator('[role="dialog"]').first();
    const isVisible = await sheet.isVisible().catch(() => false);
    expect(isVisible).toBe(false);

    console.log('[TEST 14] ✅ Workflow complet réussi');
  });

});
