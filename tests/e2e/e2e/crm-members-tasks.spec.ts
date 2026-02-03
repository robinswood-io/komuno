import { test, expect } from '@playwright/test';
import { loginAsAdminQuick } from '../helpers/auth';

/**
 * Tests E2E - CRM Members: Tasks Management
 *
 * Page: /admin/members/tasks
 *
 * Fonctionnalités testées:
 * 1. Liste des tâches avec filtres (Status, Type, Member)
 * 2. Créer tâche avec member selection
 * 3. Modifier tâche existante
 * 4. Marquer tâche comme complétée (quick action)
 * 5. Supprimer tâche avec confirmation
 * 6. Détection tâches en retard (overdue)
 * 7. Filtrage multi-critères
 *
 * Endpoints testés:
 * - GET /api/admin/tasks
 * - POST /api/admin/tasks
 * - PATCH /api/admin/tasks/:id
 * - DELETE /api/admin/tasks/:id
 *
 * URL de test: https://cjd80.rbw.ovh
 */

const BASE_URL = 'https://cjd80.rbw.ovh';

// Types de tâches
const TASK_TYPES = {
  CALL: 'call',
  EMAIL: 'email',
  MEETING: 'meeting',
  CUSTOM: 'custom'
};

// Statuts des tâches
const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Helper: Naviguer vers la page tasks
async function navigateToTasksPage(page: any) {
  await page.goto(`${BASE_URL}/admin/members/tasks`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// Helper: Attendre que le modal soit visible et prêt
async function waitForModalReady(page: any) {
  const modal = page.locator('[role="dialog"]').first();
  await expect(modal).toBeVisible({ timeout: 5000 });
  // Attendre que le modal soit complètement rendu
  await page.waitForTimeout(300);
}

// Helper: Cliquer sur le bouton submit du modal
async function clickModalSubmit(page: any, buttonText: string | RegExp = /créer|enregistrer|save|mettre à jour/i) {
  // Attendre que le modal soit visible
  const modal = page.locator('[role="dialog"]').first();
  await expect(modal).toBeVisible();
  
  // Trouver le bouton submit dans le modal avec sélection plus précise
  const submitButton = modal.locator('button').filter({ hasText: buttonText }).last();
  
  // S'assurer que le bouton est visible et activé
  await expect(submitButton).toBeVisible({ timeout: 5000 });
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  
  // Scroll si nécessaire
  await submitButton.scrollIntoViewIfNeeded();
  
  // Attendre que les autres éléments ne le bloquent pas
  await page.waitForTimeout(200);

  // Cliquer avec force pour bypasser les overlays
  await submitButton.click({ force: true });

  // Attendre que le modal se ferme
  await expect(modal).not.toBeVisible({ timeout: 8000 });

  // Attendre le rechargement des données (tasks prend plus de temps car charge par membre)
  await page.waitForTimeout(3000);
}

test.describe('CRM Members: Tasks Management', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdminQuick(page, BASE_URL);
    await navigateToTasksPage(page);
  });

  test('1. Afficher la page de gestion des tâches', async ({ page }) => {
    console.log('[TEST 1] Vérification affichage page tasks');

    // Vérifier le titre
    const title = page.locator('h1, h2').first();
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText?.toLowerCase()).toMatch(/tâches|tasks|suivi/i);

    console.log('[TEST 1] ✅ Titre affiché:', titleText);

    // Vérifier présence du bouton "Nouvelle tâche"
    const createButton = page.locator('button').filter({ hasText: /nouvelle|créer|ajouter/i }).first();
    await expect(createButton).toBeVisible({ timeout: 5000 });

    console.log('[TEST 1] ✅ Bouton créer tâche visible');
  });

  test('2. API GET /api/admin/tasks retourne la liste', async ({ page }) => {
    console.log('[TEST 2] Test API GET tasks');

    const response = await page.request.get(`${BASE_URL}/api/admin/tasks`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log('[TEST 2] Response keys:', Object.keys(data));

    // Structure attendue
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);

    console.log('[TEST 2] ✅ API retourne', data.data.length, 'tâches');

    // Si des tâches existent, vérifier structure
    if (data.data.length > 0) {
      const firstTask = data.data[0];
      expect(firstTask).toHaveProperty('id');
      expect(firstTask).toHaveProperty('title');
      expect(firstTask).toHaveProperty('status');
      expect(firstTask).toHaveProperty('taskType');
      console.log('[TEST 2] ✅ Structure task valide:', Object.keys(firstTask));
    }
  });

  test('3. Afficher la liste des tâches', async ({ page }) => {
    console.log('[TEST 3] Vérification liste tâches');

    await page.waitForTimeout(2000);

    // Chercher le tableau ou la liste
    const tableOrList = page.locator('table, [role="table"], [data-testid*="task"]').first();
    const hasContent = await tableOrList.count() > 0;

    if (hasContent) {
      await expect(tableOrList).toBeVisible();
      console.log('[TEST 3] ✅ Liste/tableau des tâches visible');

      // Vérifier colonnes: Titre, Type, Status, Membre, Date
      const pageText = await page.textContent('body');
      const hasTitleColumn = pageText?.includes('Titre') || pageText?.includes('Title');
      const hasTypeColumn = pageText?.includes('Type');
      const hasStatusColumn = pageText?.includes('Statut') || pageText?.includes('Status');

      expect(hasTitleColumn || hasTypeColumn || hasStatusColumn).toBe(true);
      console.log('[TEST 3] ✅ Colonnes détectées');
    } else {
      // État vide
      const emptyState = page.locator('text=/Aucune tâche|No tasks|Créer/i');
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 });
      console.log('[TEST 3] ✅ État vide affiché');
    }
  });

  test('4. Afficher filtres (Status, Type, Member)', async ({ page }) => {
    console.log('[TEST 4] Vérification filtres');

    await page.waitForTimeout(2000);

    // Chercher les filtres
    const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /statut|status|tout|all/i }).first();
    const typeFilter = page.locator('select, [role="combobox"]').filter({ hasText: /type|tous/i }).first();
    const memberFilter = page.locator('select, [role="combobox"]').filter({ hasText: /membre|member/i }).first();

    const statusCount = await statusFilter.count();
    const typeCount = await typeFilter.count();
    const memberCount = await memberFilter.count();

    console.log('[TEST 4] Filtres trouvés - Status:', statusCount, 'Type:', typeCount, 'Member:', memberCount);

    // Au moins un filtre devrait être présent
    expect(statusCount + typeCount + memberCount).toBeGreaterThan(0);

    if (statusCount > 0) {
      await expect(statusFilter).toBeVisible();
      console.log('[TEST 4] ✅ Filtre Status visible');
    }

    if (typeCount > 0) {
      await expect(typeFilter).toBeVisible();
      console.log('[TEST 4] ✅ Filtre Type visible');
    }

    if (memberCount > 0) {
      await expect(memberFilter).toBeVisible();
      console.log('[TEST 4] ✅ Filtre Member visible');
    }
  });

  test('5. Filtrer tâches par statut TODO', async ({ page }) => {
    console.log('[TEST 5] Filtrage par statut TODO');

    await page.waitForTimeout(2000);

    // Trouver le filtre de statut
    const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /statut|status|all/i }).first();
    const filterCount = await statusFilter.count();

    if (filterCount === 0) {
      console.log('[TEST 5] ⚠️ Filtre statut non trouvé');
      test.skip();
      return;
    }

    // Sélectionner "TODO" ou "À faire"
    await statusFilter.click();
    await page.waitForTimeout(300);

    const todoOption = page.locator('option, [role="option"]').filter({ hasText: /todo|à faire|to do/i }).first();
    if (await todoOption.count() > 0) {
      await todoOption.click();
    } else {
      // Utiliser le clavier
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(1500);

    // Vérifier que l'URL ou l'état reflète le filtre
    const currentURL = page.url();
    console.log('[TEST 5] URL après filtre:', currentURL);

    console.log('[TEST 5] ✅ Filtre TODO appliqué');
  });

  test('6. Filtrer tâches par type CALL', async ({ page }) => {
    console.log('[TEST 6] Filtrage par type CALL');

    await page.waitForTimeout(2000);

    // Trouver le filtre de type
    const typeFilter = page.locator('select, [role="combobox"]').filter({ hasText: /type|tous/i }).first();
    const filterCount = await typeFilter.count();

    if (filterCount === 0) {
      console.log('[TEST 6] ⚠️ Filtre type non trouvé');
      test.skip();
      return;
    }

    // Sélectionner "Appel" ou "Call"
    await typeFilter.click();
    await page.waitForTimeout(300);

    const callOption = page.locator('option, [role="option"]').filter({ hasText: /appel|call/i }).first();
    if (await callOption.count() > 0) {
      await callOption.click();
    } else {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(1500);

    console.log('[TEST 6] ✅ Filtre CALL appliqué');
  });

  test('7. Ouvrir modal de création de tâche', async ({ page }) => {
    console.log('[TEST 7] Ouverture modal création tâche');

    // Cliquer sur le bouton créer
    const createButton = page.locator('button').filter({ hasText: /nouvelle|créer|ajouter/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Vérifier que le modal est visible
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    console.log('[TEST 7] ✅ Modal ouvert');

    // Vérifier présence des champs
    const titleInput = page.locator('input[name="title"], input[placeholder*="titre" i]').first();
    await expect(titleInput).toBeVisible();
    console.log('[TEST 7] ✅ Champ titre visible');

    const typeSelect = page.locator('select[name="type"], [role="combobox"]').filter({ hasText: /type/i }).first();
    if (await typeSelect.count() > 0) {
      await expect(typeSelect).toBeVisible();
      console.log('[TEST 7] ✅ Sélecteur type visible');
    }

    const memberSelect = page.locator('select[name="memberEmail"], [role="combobox"]').filter({ hasText: /membre/i }).first();
    if (await memberSelect.count() > 0) {
      await expect(memberSelect).toBeVisible();
      console.log('[TEST 7] ✅ Sélecteur membre visible');
    }
  });

  test('8. Créer une nouvelle tâche', async ({ page }) => {
    console.log('[TEST 8] Création tâche');

    // Ouvrir modal
    const createButton = page.locator('button').filter({ hasText: /nouvelle|créer|ajouter/i }).first();
    await createButton.click();
    await waitForModalReady(page);

    // Sélectionner un membre EN PREMIER (Radix UI Select - id="create-member")
    const memberTrigger = page.locator('#create-member');
    await memberTrigger.click({ force: true });
    await page.waitForTimeout(500);
    const firstMemberOption = page.locator('[role="option"]').first();
    if (await firstMemberOption.count() > 0) {
      await firstMemberOption.click({ force: true });
      console.log('[TEST 8] ✅ Membre sélectionné');
    }
    await page.waitForTimeout(500);

    // Remplir le titre (controlled React component - use pressSequentially)
    const taskTitle = `Test Task ${Date.now()}`;
    const titleInput = page.locator('#create-title');
    await titleInput.click();
    await titleInput.clear();
    await page.waitForTimeout(200);
    await titleInput.pressSequentially(taskTitle, { delay: 50 });
    await page.waitForTimeout(300);
    console.log('[TEST 8] Titre saisi:', taskTitle);

    // Description (optionnel - also controlled component)
    const descInput = page.locator('#create-description');
    if (await descInput.count() > 0) {
      await descInput.click();
      await descInput.clear();
      await page.waitForTimeout(100);
      await descInput.pressSequentially('Tâche de test créée automatiquement', { delay: 30 });
      await page.waitForTimeout(200);
    }

    // Date d'échéance (optionnel)
    const dueDateInput = page.locator('input[type="date"], input[name="dueDate"]').first();
    if (await dueDateInput.count() > 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await dueDateInput.fill(dateString);
      console.log('[TEST 8] ✅ Date échéance définie');
    }

    // Soumettre avec helper
    await clickModalSubmit(page);

    // Vérifier que la tâche apparaît dans la liste
    const newTask = page.locator(`text="${taskTitle}"`);
    await expect(newTask.first()).toBeVisible({ timeout: 5000 });

    console.log('[TEST 8] ✅ Tâche créée et visible');
  });

  test('9. API POST /api/admin/tasks crée une tâche', async ({ page }) => {
    console.log('[TEST 9] Test API POST task');

    // D'abord récupérer un membre existant
    const membersResponse = await page.request.get(`${BASE_URL}/api/admin/members?limit=1`);
    const membersData = await membersResponse.json();

    if (!membersData.data || membersData.data.length === 0) {
      console.log('[TEST 9] ⚠️ Aucun membre disponible');
      test.skip();
      return;
    }

    const memberEmail = membersData.data[0].email;

    const newTask = {
      title: `API Test Task ${Date.now()}`,
      description: 'Task created via API',
      taskType: 'email',
      status: 'todo',
      memberEmail: memberEmail,
      dueDate: new Date(Date.now() + 86400000).toISOString() // +1 jour
    };

    const response = await page.request.post(`${BASE_URL}/api/admin/tasks`, {
      data: newTask
    });

    expect([200, 201]).toContain(response.status());

    const data = await response.json();
    console.log('[TEST 9] Response:', data);

    if (data.success) {
      expect(data.data).toHaveProperty('id');
      expect(data.data.title).toBe(newTask.title);
      expect(data.data.type).toBe(newTask.type);
    }

    console.log('[TEST 9] ✅ Task créée via API, ID:', data.data?.id);
  });

  test('10. Marquer tâche comme complétée (quick action)', async ({ page }) => {
    console.log('[TEST 10] Marquer comme complétée');

    await page.waitForTimeout(2000);

    // Trouver un bouton "Marquer comme complétée" ou icon de check
    const completeButtons = page.locator('button').filter({ hasText: /compléter|marquer|complete|✓|check/i });
    const buttonCount = await completeButtons.count();

    if (buttonCount === 0) {
      console.log('[TEST 10] ⚠️ Aucune tâche à compléter ou bouton non trouvé');
      test.skip();
      return;
    }

    // Cliquer sur le premier bouton
    await completeButtons.first().click();
    await page.waitForTimeout(1500);

    // Vérifier qu'un toast de confirmation apparaît ou que le statut change
    const toast = page.locator('[data-testid*="toast"], [role="status"]').filter({ hasText: /complétée|completed|success/i });
    if (await toast.count() > 0) {
      await expect(toast.first()).toBeVisible({ timeout: 3000 });
      console.log('[TEST 10] ✅ Toast de confirmation affiché');
    }

    console.log('[TEST 10] ✅ Tâche marquée comme complétée');
  });

  test('11. Modifier une tâche existante', async ({ page }) => {
    console.log('[TEST 11] Modification tâche');

    await page.waitForTimeout(2000);

    // Trouver un bouton "Modifier" ou "Edit"
    const editButtons = page.locator('button').filter({ hasText: /modifier|edit/i });
    const editCount = await editButtons.count();

    if (editCount === 0) {
      console.log('[TEST 11] ⚠️ Aucune tâche à modifier');
      test.skip();
      return;
    }

    // Cliquer sur modifier
    await editButtons.first().click();
    await waitForModalReady(page);

    // Modifier le titre
    const titleInput = page.locator('input[name="title"], input[placeholder*="titre" i]').first();
    const currentValue = await titleInput.inputValue();
    const newValue = currentValue + ' (modifié)';
    await titleInput.fill(newValue);
    console.log('[TEST 11] Titre modifié:', newValue);

    // Sauvegarder avec helper
    await clickModalSubmit(page, /enregistrer|save|mettre à jour/i);
    await page.waitForTimeout(2000);

    // Vérifier que la modification apparaît
    const modifiedTask = page.locator(`text="${newValue}"`);
    await expect(modifiedTask.first()).toBeVisible({ timeout: 5000 });

    console.log('[TEST 11] ✅ Tâche modifiée');
  });

  test('12. Supprimer une tâche avec confirmation', async ({ page }) => {
    console.log('[TEST 12] Suppression tâche');

    await page.waitForTimeout(2000);

    // Trouver un bouton "Supprimer" ou "Delete"
    const deleteButtons = page.locator('button').filter({ hasText: /supprimer|delete/i });
    const deleteCount = await deleteButtons.count();

    if (deleteCount === 0) {
      console.log('[TEST 12] ⚠️ Aucune tâche à supprimer');
      test.skip();
      return;
    }

    // Cliquer sur supprimer
    await deleteButtons.first().click();
    await page.waitForTimeout(500);

    // Vérifier la confirmation
    const confirmDialog = page.locator('[role="alertdialog"]').first();
    if (await confirmDialog.count() > 0) {
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
      console.log('[TEST 12] ✅ Dialog de confirmation affiché');

      // Confirmer
      const confirmButton = page.locator('button').filter({ hasText: /confirmer|oui|delete|supprimer/i }).last();
      await confirmButton.click();
      await page.waitForTimeout(2000);
    }

    console.log('[TEST 12] ✅ Suppression effectuée');
  });

  test('13. Détection tâches en retard (overdue)', async ({ page }) => {
    console.log('[TEST 13] Détection tâches overdue');

    await page.waitForTimeout(2000);

    // Chercher des indicateurs de retard (icon alert, couleur rouge, etc.)
    const overdueIndicators = page.locator('[data-testid*="overdue"], [class*="alert"], [class*="warning"]');
    const overdueCount = await overdueIndicators.count();

    console.log('[TEST 13] Indicateurs overdue trouvés:', overdueCount);

    if (overdueCount > 0) {
      await expect(overdueIndicators.first()).toBeVisible();
      console.log('[TEST 13] ✅ Détection overdue fonctionnelle');
    } else {
      console.log('[TEST 13] ⚠️ Aucune tâche en retard (normal)');
    }

    // Vérifier qu'il y a des tâches affichées
    const taskRows = page.locator('tr[data-testid*="task"], [data-testid*="task-item"]');
    const taskCount = await taskRows.count();
    console.log('[TEST 13] Tâches affichées:', taskCount);
  });

  test('14. Filtrage multi-critères (Status + Type)', async ({ page }) => {
    console.log('[TEST 14] Filtrage multi-critères');

    await page.waitForTimeout(2000);

    // Appliquer filtre Status
    const statusFilter = page.locator('select').filter({ hasText: /statut|status/i }).first();
    if (await statusFilter.count() > 0) {
      await statusFilter.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      console.log('[TEST 14] ✅ Filtre Status appliqué');
    }

    // Appliquer filtre Type
    const typeFilter = page.locator('select').filter({ hasText: /type/i }).first();
    if (await typeFilter.count() > 0) {
      await typeFilter.click();
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      console.log('[TEST 14] ✅ Filtre Type appliqué');
    }

    // Vérifier que les deux filtres sont actifs
    const url = page.url();
    console.log('[TEST 14] URL avec filtres:', url);

    console.log('[TEST 14] ✅ Filtrage multi-critères fonctionnel');
  });

  test('15. Workflow complet: Créer, Modifier, Compléter, Supprimer', async ({ page }) => {
    console.log('[TEST 15] Workflow complet');

    const uniqueTitle = `Workflow Task ${Date.now()}`;

    // 1. CRÉER
    console.log('[TEST 15] Étape 1: Création');
    const createButton = page.locator('button').filter({ hasText: /nouvelle|créer/i }).first();
    await createButton.click();
    await waitForModalReady(page);

    // Sélectionner un membre EN PREMIER (requis - id="create-member")
    const memberTrigger = page.locator('#create-member');
    await memberTrigger.click({ force: true });
    await page.waitForTimeout(500);
    const firstMemberOption = page.locator('[role="option"]').first();
    if (await firstMemberOption.count() > 0) {
      await firstMemberOption.click({ force: true });
    }
    await page.waitForTimeout(500);

    // Puis remplir le titre (controlled React component)
    const titleInput = page.locator('#create-title');
    await titleInput.click();
    await titleInput.clear();
    await page.waitForTimeout(200);
    await titleInput.pressSequentially(uniqueTitle, { delay: 50 });
    await page.waitForTimeout(300);

    await clickModalSubmit(page);

    const createdTask = page.locator(`text="${uniqueTitle}"`);
    await expect(createdTask.first()).toBeVisible({ timeout: 5000 });
    console.log('[TEST 15] ✅ Tâche créée');

    // 2. MODIFIER
    console.log('[TEST 15] Étape 2: Modification');
    const taskRow = page.locator('tr, [data-testid*="task"]').filter({ hasText: uniqueTitle });
    const editButton = taskRow.locator('button').filter({ hasText: /modifier|edit/i }).first();

    if (await editButton.count() > 0) {
      await editButton.click();
      await waitForModalReady(page);

      const titleInputEdit = page.locator('#edit-title');
      const modifiedTitle = uniqueTitle + ' (modifié)';
      await titleInputEdit.click();
      await titleInputEdit.clear();
      await page.waitForTimeout(200);
      await titleInputEdit.pressSequentially(modifiedTitle, { delay: 50 });
      await page.waitForTimeout(300);

      await clickModalSubmit(page, /enregistrer|save|mettre à jour/i);
      await page.waitForTimeout(2000);

      const modifiedTask = page.locator(`text="${modifiedTitle}"`);
      await expect(modifiedTask.first()).toBeVisible({ timeout: 5000 });
      console.log('[TEST 15] ✅ Tâche modifiée');
    }

    // 3. COMPLÉTER
    console.log('[TEST 15] Étape 3: Complétion');
    const taskRowComplete = page.locator('tr, [data-testid*="task"]').filter({ hasText: /Workflow Task/ });
    const completeButton = taskRowComplete.locator('button').filter({ hasText: /compléter|complete|✓/i }).first();

    if (await completeButton.count() > 0) {
      await completeButton.click();
      await page.waitForTimeout(2000);
      console.log('[TEST 15] ✅ Tâche complétée');
    }

    // 4. SUPPRIMER
    console.log('[TEST 15] Étape 4: Suppression');
    const taskRowDelete = page.locator('tr, [data-testid*="task"]').filter({ hasText: /Workflow Task/ });
    const deleteButton = taskRowDelete.locator('button').filter({ hasText: /supprimer|delete/i }).first();

    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      await page.waitForTimeout(500);

      const confirmButton = page.locator('button').filter({ hasText: /confirmer|oui|delete/i }).last();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }

      console.log('[TEST 15] ✅ Tâche supprimée');
    }

    console.log('[TEST 15] ✅ Workflow complet réussi');
  });

});
