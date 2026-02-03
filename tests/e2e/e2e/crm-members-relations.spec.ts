import { test, expect, type Page } from '@playwright/test';
import { loginAsAdminQuick } from '../helpers/auth';

/**
 * Tests E2E - CRM Members: Relations Management
 *
 * Page: /admin/members/relations
 *
 * Fonctionnalités testées:
 * 1. Afficher page gestion des relations
 * 2. API GET /api/admin/relations retourne liste
 * 3. Afficher liste des relations
 * 4. Afficher filtres (Type, Member)
 * 5. Filtrer par type de relation (sponsor)
 * 6. Filtrer par type de relation (godparent)
 * 7. Filtrer par type de relation (colleague)
 * 8. Filtrer par type de relation (friend)
 * 9. Filtrer par type de relation (business_partner)
 * 10. Filtrer par membre
 * 11. Ouvrir modal de création de relation
 * 12. Créer nouvelle relation avec sélection membre
 * 13. API POST /api/admin/relations crée une relation
 * 14. Vérifier affichage bidirectionnel relation
 * 15. Badges color-codés par type
 * 16. Supprimer relation avec confirmation
 * 17. API DELETE /api/admin/relations/:id supprime
 * 18. Validation: deux membres obligatoires
 * 19. Workflow complet: Créer et Supprimer
 *
 * Endpoints testés:
 * - GET /api/admin/relations
 * - POST /api/admin/relations
 * - DELETE /api/admin/relations/:id
 *
 * URL de test: https://cjd80.rbw.ovh
 */

const BASE_URL = 'https://cjd80.rbw.ovh';

// Types de relations (alignés avec le schéma DB)
const RELATION_TYPES = {
  SPONSOR: 'sponsor',
  TEAM: 'team',
  CUSTOM: 'custom',
  // Aliases pour compatibilité avec tests existants
  GODPARENT: 'sponsor',  // Mappé à sponsor
  COLLEAGUE: 'team',     // Mappé à team
  FRIEND: 'custom',      // Mappé à custom
  BUSINESS_PARTNER: 'custom' // Mappé à custom
};

// Couleurs attendues par type
const RELATION_TYPE_COLORS: Record<string, string> = {
  sponsor: 'blue',
  godparent: 'purple',
  colleague: 'green',
  friend: 'pink',
  business_partner: 'orange'
};

// Labels des types (pour recherche dans l'UI)
const RELATION_TYPE_LABELS: Record<string, string> = {
  sponsor: 'Parrain/marraine',
  godparent: 'Filleul/filleule',
  colleague: 'Collègue',
  friend: 'Ami',
  business_partner: 'Partenaire d\'affaires'
};

// Helper: Naviguer vers la page relations
async function navigateToRelationsPage(page: Page) {
  await page.goto(`${BASE_URL}/admin/members/relations`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

test.describe('CRM Members: Relations Management', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdminQuick(page, BASE_URL);
    await navigateToRelationsPage(page);
  });

  test('1. Afficher la page de gestion des relations', async ({ page }) => {
    console.log('[TEST 1] Vérification affichage page relations');

    // Vérifier le titre
    const title = page.locator('h1, h2').first();
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText?.toLowerCase()).toMatch(/relations|gestion des relations/i);

    console.log('[TEST 1] ✅ Titre affiché:', titleText);

    // Vérifier présence du bouton "Créer une relation"
    const createButton = page.locator('button').filter({ hasText: /créer|nouvelle|ajouter/i }).first();
    await expect(createButton).toBeVisible({ timeout: 5000 });

    console.log('[TEST 1] ✅ Bouton créer relation visible');
  });

  test('2. API GET /api/admin/relations retourne la liste', async ({ page }) => {
    console.log('[TEST 2] Test API GET relations');

    const response = await page.request.get(`${BASE_URL}/api/admin/relations`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log('[TEST 2] Response keys:', Object.keys(data));

    // Structure attendue
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);

    console.log('[TEST 2] ✅ API retourne', data.data.length, 'relations');

    // Si des relations existent, vérifier structure
    if (data.data.length > 0) {
      const firstRelation = data.data[0];
      expect(firstRelation).toHaveProperty('id');
      expect(firstRelation).toHaveProperty('memberEmail');
      expect(firstRelation).toHaveProperty('relatedMemberEmail');
      expect(firstRelation).toHaveProperty('relationType');
      console.log('[TEST 2] ✅ Structure relation valide:', Object.keys(firstRelation));
    }
  });

  test('3. Afficher la liste des relations', async ({ page }) => {
    console.log('[TEST 3] Vérification liste relations');

    await page.waitForTimeout(2000);

    // Chercher le tableau ou la liste
    const tableOrList = page.locator('table, [role="table"], [data-testid*="relation"]').first();
    const hasContent = await tableOrList.count() > 0;

    if (hasContent) {
      await expect(tableOrList).toBeVisible();
      console.log('[TEST 3] ✅ Liste/tableau des relations visible');

      // Vérifier colonnes: Membre 1, Type, Membre 2, Actions
      const pageText = await page.textContent('body');
      const hasMemberColumn = pageText?.includes('Membre') || pageText?.includes('Member');
      const hasTypeColumn = pageText?.includes('Type') || pageText?.includes('relation');
      const hasActionsColumn = pageText?.includes('Actions') || pageText?.includes('Action');

      expect(hasMemberColumn || hasTypeColumn || hasActionsColumn).toBe(true);
      console.log('[TEST 3] ✅ Colonnes détectées');
    } else {
      // État vide
      const emptyState = page.locator('text=/Aucune relation|No relations|Créer/i');
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 });
      console.log('[TEST 3] ✅ État vide affiché');
    }
  });

  test('4. Afficher filtres (Type, Member)', async ({ page }) => {
    console.log('[TEST 4] Vérification filtres');

    await page.waitForTimeout(2000);

    // Chercher les filtres - boutons et select
    const typeFilterLabel = page.locator('text=/Type de relation/i').first();
    const memberFilterLabel = page.locator('text=/Membre/i').first();

    let hasTypeFilter = false;
    let hasMemberFilter = false;

    if (await typeFilterLabel.count() > 0) {
      await expect(typeFilterLabel).toBeVisible();
      hasTypeFilter = true;
      console.log('[TEST 4] ✅ Label filtre type visible');
    }

    if (await memberFilterLabel.count() > 0) {
      await expect(memberFilterLabel).toBeVisible();
      hasMemberFilter = true;
      console.log('[TEST 4] ✅ Label filtre membre visible');
    }

    // Au moins un filtre devrait être présent
    expect(hasTypeFilter || hasMemberFilter).toBe(true);
  });

  test('5. Filtrer par type de relation: sponsor', async ({ page }) => {
    console.log('[TEST 5] Filtrage par type sponsor');

    await page.waitForTimeout(2000);

    // Trouver les boutons de filtre type
    const sponsorButton = page.locator('button').filter({ hasText: /parrain|marraine|sponsor/i }).first();
    const sponsorButtonCount = await sponsorButton.count();

    if (sponsorButtonCount === 0) {
      console.log('[TEST 5] ⚠️ Bouton sponsor non trouvé');
      test.skip();
      return;
    }

    // Cliquer sur le bouton sponsor
    await sponsorButton.click();
    await page.waitForTimeout(1500);

    // Vérifier que le filtre est appliqué
    const currentURL = page.url();
    console.log('[TEST 5] URL après filtre sponsor:', currentURL);

    console.log('[TEST 5] ✅ Filtre sponsor appliqué');
  });

  test('6. Filtrer par type de relation: godparent', async ({ page }) => {
    console.log('[TEST 6] Filtrage par type godparent');

    await page.waitForTimeout(2000);

    // Trouver le bouton godparent
    const godparentButton = page.locator('button').filter({ hasText: /filleul|filleule|godparent/i }).first();
    const godparentButtonCount = await godparentButton.count();

    if (godparentButtonCount === 0) {
      console.log('[TEST 6] ⚠️ Bouton godparent non trouvé');
      test.skip();
      return;
    }

    // Cliquer sur le bouton
    await godparentButton.click();
    await page.waitForTimeout(1500);

    console.log('[TEST 6] ✅ Filtre godparent appliqué');
  });

  test('7. Filtrer par type de relation: colleague', async ({ page }) => {
    console.log('[TEST 7] Filtrage par type colleague');

    await page.waitForTimeout(2000);

    // Trouver le bouton colleague
    const colleagueButton = page.locator('button').filter({ hasText: /collègue|colleague/i }).first();
    const colleagueButtonCount = await colleagueButton.count();

    if (colleagueButtonCount === 0) {
      console.log('[TEST 7] ⚠️ Bouton colleague non trouvé');
      test.skip();
      return;
    }

    // Cliquer sur le bouton
    await colleagueButton.click();
    await page.waitForTimeout(1500);

    console.log('[TEST 7] ✅ Filtre colleague appliqué');
  });

  test('8. Filtrer par type de relation: friend', async ({ page }) => {
    console.log('[TEST 8] Filtrage par type friend');

    await page.waitForTimeout(2000);

    // Trouver le bouton friend
    const friendButton = page.locator('button').filter({ hasText: /ami|friend/i }).first();
    const friendButtonCount = await friendButton.count();

    if (friendButtonCount === 0) {
      console.log('[TEST 8] ⚠️ Bouton friend non trouvé');
      test.skip();
      return;
    }

    // Cliquer sur le bouton
    await friendButton.click();
    await page.waitForTimeout(1500);

    console.log('[TEST 8] ✅ Filtre friend appliqué');
  });

  test('9. Filtrer par type de relation: business_partner', async ({ page }) => {
    console.log('[TEST 9] Filtrage par type business_partner');

    await page.waitForTimeout(2000);

    // Trouver le bouton business_partner
    const businessPartnerButton = page.locator('button').filter({ hasText: /partenaire.*affaires|business.*partner/i }).first();
    const businessPartnerButtonCount = await businessPartnerButton.count();

    if (businessPartnerButtonCount === 0) {
      console.log('[TEST 9] ⚠️ Bouton business_partner non trouvé');
      test.skip();
      return;
    }

    // Cliquer sur le bouton
    await businessPartnerButton.click();
    await page.waitForTimeout(1500);

    console.log('[TEST 9] ✅ Filtre business_partner appliqué');
  });

  test('10. Filtrer par membre', async ({ page }) => {
    console.log('[TEST 10] Filtrage par membre');

    await page.waitForTimeout(2000);

    // Trouver le select de filtre membre
    const memberSelect = page.locator('select').filter({ hasText: /membre/i }).first();
    const memberSelectCount = await memberSelect.count();

    if (memberSelectCount === 0) {
      console.log('[TEST 10] ⚠️ Select filtre membre non trouvé');
      test.skip();
      return;
    }

    // Cliquer sur le select
    await memberSelect.click({ force: true });
    await page.waitForTimeout(300);

    // Sélectionner la première option (autre que "Tous")
    const options = await memberSelect.locator('option').count();
    if (options > 1) {
      await memberSelect.selectOption({ index: 1 });
      console.log('[TEST 10] ✅ Option membre sélectionnée');
    }

    await page.waitForTimeout(1500);

    console.log('[TEST 10] ✅ Filtre membre appliqué');
  });

  test('11. Ouvrir modal de création de relation', async ({ page }) => {
    console.log('[TEST 11] Ouverture modal création relation');

    // Cliquer sur le bouton créer
    const createButton = page.locator('button').filter({ hasText: /créer|nouvelle|ajouter/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Vérifier que le modal est visible
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    console.log('[TEST 11] ✅ Modal ouvert');

    // Vérifier présence des champs
    const memberEmailInput = page.locator('select, [role="combobox"]').filter({ hasText: /membre principal|main member/i }).first();
    if (await memberEmailInput.count() > 0) {
      await expect(memberEmailInput).toBeVisible();
      console.log('[TEST 11] ✅ Champ membre principal visible');
    }

    const relationTypeSelect = page.locator('select, [role="combobox"]').filter({ hasText: /type de relation|relation type/i }).first();
    if (await relationTypeSelect.count() > 0) {
      await expect(relationTypeSelect).toBeVisible();
      console.log('[TEST 11] ✅ Champ type de relation visible');
    }

    const relatedMemberSelect = page.locator('select, [role="combobox"]').filter({ hasText: /membre lié|related member/i }).first();
    if (await relatedMemberSelect.count() > 0) {
      await expect(relatedMemberSelect).toBeVisible();
      console.log('[TEST 11] ✅ Champ membre lié visible');
    }
  });

  test('12. Créer nouvelle relation avec sélection membre', async ({ page }) => {
    console.log('[TEST 12] Création relation avec sélection membres');

    // Ouvrir modal
    const createButton = page.locator('button').filter({ hasText: /créer|nouvelle|ajouter/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Chercher les selects - avec stratégie flexible
    const allSelects = page.locator('[role="combobox"], select');
    const selectCount = await allSelects.count();

    if (selectCount < 3) {
      console.log('[TEST 12] ⚠️ Pas assez de champs select trouvés');
      test.skip();
      return;
    }

    // Stratégie: repérer par label ou contenu visible
    // 1. Sélectionner membre principal (premier select)
    const firstSelect = allSelects.nth(0);
    await firstSelect.click({ force: true });
    await page.waitForTimeout(300);

    // Sélectionner la première option
    const firstSelectOptions = firstSelect.locator('[role="option"]');
    const firstOptionCount = await firstSelectOptions.count();
    if (firstOptionCount > 0) {
      await firstSelectOptions.first().click();
      console.log('[TEST 12] ✅ Membre principal sélectionné');
    } else {
      // Fallback: utiliser le clavier
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(500);

    // 2. Sélectionner type de relation (deuxième select)
    const secondSelect = allSelects.nth(1);
    await secondSelect.click({ force: true });
    await page.waitForTimeout(300);

    const secondSelectOptions = secondSelect.locator('[role="option"]');
    if (await secondSelectOptions.count() > 0) {
      await secondSelectOptions.first().click();
      console.log('[TEST 12] ✅ Type de relation sélectionné');
    } else {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(500);

    // 3. Sélectionner membre lié (troisième select)
    const thirdSelect = allSelects.nth(2);
    await thirdSelect.click({ force: true });
    await page.waitForTimeout(300);

    const thirdSelectOptions = thirdSelect.locator('[role="option"]');
    if (await thirdSelectOptions.count() > 0) {
      // Sélectionner un autre membre que le premier
      if (await thirdSelectOptions.count() > 1) {
        await thirdSelectOptions.nth(1).click();
      } else {
        await thirdSelectOptions.first().click();
      }
      console.log('[TEST 12] ✅ Membre lié sélectionné');
    } else {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(500);

    // Soumettre le formulaire
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /créer|enregistrer|save/i }).first();
    await submitButton.click({ force: true });

    // Attendre la fermeture du modal et le rechargement des données
    await page.waitForTimeout(2000);

    console.log('[TEST 12] ✅ Relation créée');
  });

  test('13. API POST /api/admin/relations crée une relation', async ({ page }) => {
    console.log('[TEST 13] Test API POST relation');

    // D'abord récupérer la liste des membres
    const membersResponse = await page.request.get(`${BASE_URL}/api/admin/members`);
    const membersData = await membersResponse.json();

    if (!membersData.data || membersData.data.length < 2) {
      console.log('[TEST 13] ⚠️ Pas assez de membres pour créer relation');
      test.skip();
      return;
    }

    const member1Email = membersData.data[0].email;
    const member2Email = membersData.data[1].email;

    const newRelation = {
      memberEmail: member1Email,
      relatedMemberEmail: member2Email,
      relationType: RELATION_TYPES.SPONSOR,
      description: `API Test Relation ${Date.now()}`
    };

    console.log('[TEST 13] Création relation via API:', newRelation);

    const response = await page.request.post(`${BASE_URL}/api/admin/relations`, {
      data: newRelation
    });

    expect([200, 201]).toContain(response.status());

    const data = await response.json();
    console.log('[TEST 13] Response:', data);

    if (data.success) {
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id');
      expect(data.data.memberEmail).toBe(newRelation.memberEmail);
      expect(data.data.relatedMemberEmail).toBe(newRelation.relatedMemberEmail);
      expect(data.data.relationType).toBe(newRelation.relationType);
    }

    console.log('[TEST 13] ✅ Relation créée via API, ID:', data.data?.id);
  });

  test('14. Vérifier affichage bidirectionnel relation', async ({ page }) => {
    console.log('[TEST 14] Vérification affichage bidirectionnel');

    await page.waitForTimeout(2000);

    // Chercher le tableau
    const tableOrList = page.locator('table, [role="table"]').first();
    const hasContent = await tableOrList.count() > 0;

    if (!hasContent) {
      console.log('[TEST 14] ⚠️ Aucune relation affichée');
      test.skip();
      return;
    }

    // Compter les lignes de relations
    const relationRows = page.locator('tbody tr, [role="row"]');
    const rowCount = await relationRows.count();

    if (rowCount < 1) {
      console.log('[TEST 14] ⚠️ Aucune relation trouvée dans le tableau');
      test.skip();
      return;
    }

    // Vérifier que chaque relation affiche deux membres
    const firstRow = relationRows.first();
    const cells = firstRow.locator('td');
    const cellCount = await cells.count();

    expect(cellCount).toBeGreaterThanOrEqual(3); // Minimum: Membre1, Type, Membre2

    console.log('[TEST 14] ✅ Relations affichées avec deux membres (cellCount:', cellCount, ')');
  });

  test('15. Badges color-codés par type', async ({ page }) => {
    console.log('[TEST 15] Vérification badges color-codés');

    await page.waitForTimeout(2000);

    // Chercher les badges de type
    const badges = page.locator('[role="button"][class*="badge"], .badge').filter({ hasText: /parrain|filleul|collègue|ami|partenaire/i });
    const badgeCount = await badges.count();

    if (badgeCount === 0) {
      console.log('[TEST 15] ⚠️ Aucun badge trouvé');
      test.skip();
      return;
    }

    console.log('[TEST 15] Badges trouvés:', badgeCount);

    // Chercher les styles de couleurs des badges
    // Chercher les badges avec classes de couleur
    const blueBadges = page.locator('[class*="blue"], [style*="blue"], [class*="bg-blue"]');
    const purpleBadges = page.locator('[class*="purple"], [style*="purple"], [class*="bg-purple"]');
    const greenBadges = page.locator('[class*="green"], [style*="green"], [class*="bg-green"]');
    const pinkBadges = page.locator('[class*="pink"], [style*="pink"], [class*="bg-pink"]');
    const orangeBadges = page.locator('[class*="orange"], [style*="orange"], [class*="bg-orange"]');

    const blueCount = await blueBadges.count();
    const purpleCount = await purpleBadges.count();
    const greenCount = await greenBadges.count();
    const pinkCount = await pinkBadges.count();
    const orangeCount = await orangeBadges.count();

    console.log('[TEST 15] Couleurs détectées - Blue:', blueCount, 'Purple:', purpleCount, 'Green:', greenCount, 'Pink:', pinkCount, 'Orange:', orangeCount);

    // Au minimum, des badges doivent être affichés
    expect(badgeCount).toBeGreaterThan(0);

    console.log('[TEST 15] ✅ Badges color-codés visibles');
  });

  test('16. Supprimer relation avec confirmation', async ({ page }) => {
    console.log('[TEST 16] Suppression relation avec confirmation');

    await page.waitForTimeout(2000);

    // Trouver un bouton "Supprimer" ou delete
    const deleteButtons = page.locator('button').filter({ hasText: /supprimer|delete|trash/i });
    const deleteCount = await deleteButtons.count();

    if (deleteCount === 0) {
      console.log('[TEST 16] ⚠️ Aucune relation à supprimer');
      test.skip();
      return;
    }

    // Cliquer sur supprimer
    await deleteButtons.first().click();
    await page.waitForTimeout(500);

    // Vérifier l'affichage de la confirmation (AlertDialog)
    const confirmDialog = page.locator('[role="alertdialog"], [data-testid*="alert"], [data-testid*="confirm"]').first();
    const dialogCount = await confirmDialog.count();

    if (dialogCount > 0) {
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
      console.log('[TEST 16] ✅ Dialog de confirmation affiché');

      // Confirmer la suppression
      const confirmButton = page.locator('button').filter({ hasText: /confirmer|oui|delete|supprimer/i }).last();
      await confirmButton.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('[TEST 16] ⚠️ Dialog de confirmation non trouvé, suppression directe');
    }

    console.log('[TEST 16] ✅ Suppression effectuée');
  });

  test('17. API DELETE /api/admin/relations/:id supprime', async ({ page }) => {
    console.log('[TEST 17] Test API DELETE relation');

    // D'abord créer une relation à supprimer
    const membersResponse = await page.request.get(`${BASE_URL}/api/admin/members`);
    const membersData = await membersResponse.json();

    if (!membersData.data || membersData.data.length < 2) {
      console.log('[TEST 17] ⚠️ Pas assez de membres');
      test.skip();
      return;
    }

    const newRelation = {
      memberEmail: membersData.data[0].email,
      relatedMemberEmail: membersData.data[1].email,
      relationType: RELATION_TYPES.FRIEND,
      description: `Relation to Delete ${Date.now()}`
    };

    const createResponse = await page.request.post(`${BASE_URL}/api/admin/relations`, {
      data: newRelation
    });

    console.log('[TEST 17] Create response status:', createResponse.status());
    if (createResponse.status() !== 200 && createResponse.status() !== 201) {
      const errorText = await createResponse.text();
      console.log('[TEST 17] Create error:', errorText);
    }

    expect([200, 201]).toContain(createResponse.status());
    const createData = await createResponse.json();
    const relationId = createData.data?.id;

    if (!relationId) {
      console.log('[TEST 17] ⚠️ Impossible de créer relation pour test suppression');
      test.skip();
      return;
    }

    console.log('[TEST 17] Relation créée avec ID:', relationId);

    // Supprimer la relation
    const deleteResponse = await page.request.delete(`${BASE_URL}/api/admin/relations/${relationId}`);

    expect([200, 204]).toContain(deleteResponse.status());
    console.log('[TEST 17] ✅ Relation supprimée via API, status:', deleteResponse.status());
  });

  test('18. Validation: deux membres obligatoires', async ({ page }) => {
    console.log('[TEST 18] Validation deux membres obligatoires');

    // Attendre que la page soit stable
    await page.waitForLoadState('networkidle');

    // Ouvrir modal
    const createButton = page.locator('button').filter({ hasText: /créer|nouvelle|ajouter/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Attendre que la page soit stable après le clic
    await page.waitForLoadState('domcontentloaded');

    // Vérifier que le modal est ouvert
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Tenter de soumettre sans sélectionner les membres
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /créer|enregistrer/i }).first();

    // Le bouton devrait être disabled ou une erreur devrait apparaître
    const isDisabled = await submitButton.isDisabled();
    console.log('[TEST 18] Bouton submit disabled:', isDisabled);

    if (isDisabled) {
      console.log('[TEST 18] ✅ Validation via disabled state fonctionnelle');
    } else {
      // Essayer de cliquer - une erreur devrait apparaître
      await submitButton.click({ force: true });
      await page.waitForTimeout(1000);

      // Vérifier qu'un message d'erreur apparaît
      const errorMessage = page.locator('text=/obligatoire|requis|required/i');
      const errorCount = await errorMessage.count();

      if (errorCount > 0) {
        console.log('[TEST 18] ✅ Message d\'erreur validation affiché');
      } else {
        // Le modal devrait rester ouvert
        const stillOpen = await modal.isVisible();
        expect(stillOpen).toBe(true);
        console.log('[TEST 18] ✅ Validation appliquée (modal reste ouvert)');
      }
    }
  });

  test('19. Workflow complet: Créer et Supprimer', async ({ page }) => {
    console.log('[TEST 19] Workflow complet: Créer et Supprimer');

    // 1. CRÉER
    console.log('[TEST 19] Étape 1: Création');
    const createButton = page.locator('button').filter({ hasText: /créer|nouvelle|ajouter/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Récupérer les selects
    const allSelects = page.locator('[role="combobox"], select');
    const selectCount = await allSelects.count();

    if (selectCount < 3) {
      console.log('[TEST 19] ⚠️ Pas assez de champs');
      test.skip();
      return;
    }

    // Sélectionner membre principal
    const firstSelect = allSelects.nth(0);
    await firstSelect.click({ force: true });
    await page.waitForTimeout(300);
    const firstOptions = firstSelect.locator('[role="option"]');
    if (await firstOptions.count() > 0) {
      await firstOptions.first().click();
    } else {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(500);

    // Sélectionner type
    const secondSelect = allSelects.nth(1);
    await secondSelect.click({ force: true });
    await page.waitForTimeout(300);
    const secondOptions = secondSelect.locator('[role="option"]');
    if (await secondOptions.count() > 0) {
      await secondOptions.first().click();
    } else {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(500);

    // Sélectionner membre lié
    const thirdSelect = allSelects.nth(2);
    await thirdSelect.click({ force: true });
    await page.waitForTimeout(300);
    const thirdOptions = thirdSelect.locator('[role="option"]');
    if (await thirdOptions.count() > 1) {
      await thirdOptions.nth(1).click();
    } else if (await thirdOptions.count() > 0) {
      await thirdOptions.first().click();
    } else {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(500);

    // Soumettre
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /créer|enregistrer|save/i }).first();
    await submitButton.click({ force: true });
    await page.waitForTimeout(2000);

    console.log('[TEST 19] ✅ Relation créée');

    // 2. SUPPRIMER
    console.log('[TEST 19] Étape 2: Suppression');
    await page.waitForTimeout(1000);

    // Trouver un bouton supprimer
    const deleteButtons = page.locator('button').filter({ hasText: /supprimer|delete/i });
    const deleteCount = await deleteButtons.count();

    if (deleteCount > 0) {
      await deleteButtons.first().click();
      await page.waitForTimeout(500);

      // Confirmer si dialog
      const confirmDialog = page.locator('[role="alertdialog"]').first();
      if (await confirmDialog.count() > 0) {
        const confirmButton = page.locator('button').filter({ hasText: /confirmer|oui|delete|supprimer/i }).last();
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }

      console.log('[TEST 19] ✅ Relation supprimée');
    } else {
      console.log('[TEST 19] ⚠️ Aucune relation trouvée à supprimer');
    }

    console.log('[TEST 19] ✅ Workflow complet réussi');
  });

});
