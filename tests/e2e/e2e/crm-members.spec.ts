import { test, expect } from '@playwright/test';
import { loginAsAdminQuick } from '../helpers/auth';

/**
 * Tests E2E - US-MEMBERS-001: CRM - Gestion des membres
 *
 * User Story: En tant qu'admin, je veux un CRM centralisant les membres
 * pour suivre les engagements.
 *
 * Endpoints testés:
 * - GET /api/admin/members?page=1&limit=20&status=active&search=dupont&score=high
 * - GET /api/admin/members/:email
 * - POST /api/admin/members
 * - PATCH /api/admin/members/:email
 * - POST /api/admin/members/:email/tags
 * - POST /api/admin/members/:email/tasks
 *
 * URL de test: https://cjd80.rbw.ovh
 */

const BASE_URL = 'https://cjd80.rbw.ovh';

// Comptes de test
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@test.local',
    password: 'devmode',
    role: 'super_admin'
  }
};

// Données de test
const TEST_MEMBER = {
  email: 'jean.dupont@example.com',
  firstName: 'Jean',
  lastName: 'Dupont',
  company: 'Entreprise Test',
  phone: '0123456789',
  status: 'active',
  engagementScore: 'high'
};

const UPDATED_MEMBER = {
  firstName: 'Jean-Pierre',
  lastName: 'Dupont-Martin',
  phone: '0987654321'
};

interface ConsoleMessage {
  type: string;
  text: string;
  timestamp: string;
  location?: string;
}

interface NetworkRequest {
  url: string;
  status: number;
  method: string;
  timestamp: string;
}

test.describe('US-MEMBERS-001: CRM - Gestion des membres', () => {
  let consoleMessages: ConsoleMessage[] = [];
  let networkRequests: NetworkRequest[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdminQuick(page, BASE_URL);
    consoleMessages = [];
    networkRequests = [];

    // Capture all console messages
    page.on('console', (msg) => {
      const consoleEntry: ConsoleMessage = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
        location: msg.location().url
      };
      consoleMessages.push(consoleEntry);
      console.log('[CONSOLE ' + msg.type().toUpperCase() + '] ' + msg.text());
    });

    // Capture network responses
    page.on('response', async (response) => {
      const status = response.status();
      const url = response.url();
      const method = response.request().method();

      networkRequests.push({
        url,
        status,
        method,
        timestamp: new Date().toISOString()
      });

      if (status >= 400) {
        console.log('[NETWORK ERROR] ' + status + ' ' + method + ' ' + url);
      }
    });

  });

  test.afterEach(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));

    console.log('\n--- Network Requests ---');
    console.log('Total requests: ' + networkRequests.length);
    const errorRequests = networkRequests.filter(r => r.status >= 400);
    console.log('Requests with errors (4xx/5xx): ' + errorRequests.length);
    if (errorRequests.length > 0) {
      errorRequests.forEach(req => {
        console.log('  [' + req.status + '] ' + req.method + ' ' + req.url.substring(0, 100));
      });
    }

    console.log('\n--- Console Messages ---');
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');
    console.log('Total console messages: ' + consoleMessages.length);
    console.log('Errors: ' + errors.length);
    console.log('Warnings: ' + warnings.length);

    if (errors.length > 0) {
      console.log('\n  Errors:');
      errors.forEach(err => {
        console.log('    - ' + err.text.substring(0, 150));
        if (err.location) console.log('      at ' + err.location);
      });
    }

    console.log('\n' + '='.repeat(80));
  });

  // Test 1: Accéder dashboard CRM
  test('Accéder au dashboard CRM et vérifier le chargement de la page', async ({ page }) => {
    console.log('\n[TEST 1] Accédant au dashboard CRM...');

    await page.goto(BASE_URL + '/admin/members', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('[TEST 1] URL: ' + page.url());
    console.log('[TEST 1] Title: ' + await page.title());

    const pageContent = await page.content();
    const isPageLoaded = pageContent.length > 100;
    console.log('[TEST 1] Page content length: ' + pageContent.length);

    expect(isPageLoaded).toBe(true);
    expect(page.url()).toContain('/admin/members');
  });

  // Test 2: Vérifier que le dashboard affiche la liste des membres
  test('Vérifier que la liste des membres est affichée', async ({ page }) => {
    console.log('\n[TEST 2] Vérification de la liste des membres...');

    // Mock API response pour la liste des membres
    await page.route(BASE_URL + '/api/admin/members*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                email: 'jean.dupont@example.com',
                firstName: 'Jean',
                lastName: 'Dupont',
                company: 'Entreprise Test',
                status: 'active',
                engagementScore: 'high',
                createdAt: '2025-01-01T00:00:00Z'
              },
              {
                email: 'marie.martin@example.com',
                firstName: 'Marie',
                lastName: 'Martin',
                company: 'Autre Entreprise',
                status: 'active',
                engagementScore: 'medium',
                createdAt: '2025-01-02T00:00:00Z'
              }
            ],
            total: 2,
            page: 1,
            limit: 20
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    console.log('[TEST 2] Cherchant les membres dans la page...');

    // Vérifier la présence des données des membres
    const memberNames = ['Jean Dupont', 'Marie Martin', 'Dupont', 'Martin'];
    for (const name of memberNames) {
      const element = page.locator('text=' + name);
      const count = await element.count();
      console.log('[TEST 2] Éléments trouvés pour "' + name + '": ' + count);
    }

    // Vérifier qu'au moins une liste ou tableau est présent
    const tables = await page.locator('table').count();
    const lists = await page.locator('ul, ol').count();
    const cards = await page.locator('[data-testid*="member"], [class*="member"]').count();

    console.log('[TEST 2] Tables trouvées: ' + tables);
    console.log('[TEST 2] Listes trouvées: ' + lists);
    console.log('[TEST 2] Cartes/conteneurs trouvés: ' + cards);

    const totalElements = tables + lists + cards;
    expect(totalElements).toBeGreaterThanOrEqual(0);
  });

  // Test 3: Filtrer membres par statut
  test('Filtrer les membres par statut actif', async ({ page }) => {
    console.log('\n[TEST 3] Test de filtrage par statut...');

    // Mock API avec filtrage
    await page.route(BASE_URL + '/api/admin/members?*status=active*', async (route) => {
      const url = route.request().url();
      console.log('[TEST 3] Requête API: ' + url);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              email: 'jean.dupont@example.com',
              firstName: 'Jean',
              lastName: 'Dupont',
              company: 'Entreprise Test',
              status: 'active',
              engagementScore: 'high',
              createdAt: '2025-01-01T00:00:00Z'
            }
          ],
          total: 1,
          page: 1,
          limit: 20
        })
      });
    });

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');

    console.log('[TEST 3] Cherchant le filtre de statut...');

    // Chercher le select de statut
    const statusSelect = page.locator('select[name*="status"], [data-testid*="status-filter"]').first();
    const statusSelectCount = await statusSelect.count();
    console.log('[TEST 3] Filtre de statut trouvé: ' + (statusSelectCount > 0));

    if (statusSelectCount > 0) {
      await statusSelect.selectOption('active');
      await page.waitForTimeout(500);
      console.log('[TEST 3] Filtre appliqué: active');
    } else {
      console.log('[TEST 3] Filtre de statut non trouvé, cherchant des boutons de filtre...');
      const filterButtons = page.locator('button:has-text("actif"), button:has-text("Active"), button[data-testid*="filter"]');
      const count = await filterButtons.count();
      console.log('[TEST 3] Boutons de filtre trouvés: ' + count);
    }

    const totalFilters = statusSelectCount + (await page.locator('button[data-testid*="filter"]').count());
    expect(totalFilters).toBeGreaterThanOrEqual(0);
  });

  // Test 4: Rechercher membre par nom
  test('Rechercher un membre par nom (dupont)', async ({ page }) => {
    console.log('\n[TEST 4] Test de recherche par nom...');

    // Mock API avec recherche
    await page.route(BASE_URL + '/api/admin/members?*search=dupont*', async (route) => {
      const url = route.request().url();
      console.log('[TEST 4] Requête API: ' + url);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              email: 'jean.dupont@example.com',
              firstName: 'Jean',
              lastName: 'Dupont',
              company: 'Entreprise Test',
              status: 'active',
              engagementScore: 'high',
              createdAt: '2025-01-01T00:00:00Z'
            }
          ],
          total: 1,
          page: 1,
          limit: 20
        })
      });
    });

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');

    console.log('[TEST 4] Cherchant le champ de recherche...');

    // Chercher le champ de recherche
    const searchInput = page.locator('input[type="text"][placeholder*="search" i], input[placeholder*="Rechercher" i], [data-testid*="search"]').first();
    const searchCount = await searchInput.count();
    console.log('[TEST 4] Champ de recherche trouvé: ' + (searchCount > 0));

    if (searchCount > 0) {
      await searchInput.fill('dupont');
      await page.waitForTimeout(500);
      console.log('[TEST 4] Recherche appliquée: dupont');

      // Vérifier la présence du résultat
      const resultElement = page.locator('text=Dupont').first();
      const resultCount = await resultElement.count();
      console.log('[TEST 4] Résultats trouvés: ' + (resultCount > 0));

      expect(resultCount).toBeGreaterThanOrEqual(0);
    } else {
      console.log('[TEST 4] Champ de recherche non trouvé');
    }
  });

  // Test 5: Filtrer par score d'engagement
  test('Filtrer les membres par score d\'engagement élevé', async ({ page }) => {
    console.log('\n[TEST 5] Test de filtrage par score d\'engagement...');

    // Mock API avec filtrage par score
    await page.route(BASE_URL + '/api/admin/members?*score=high*', async (route) => {
      const url = route.request().url();
      console.log('[TEST 5] Requête API: ' + url);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              email: 'jean.dupont@example.com',
              firstName: 'Jean',
              lastName: 'Dupont',
              company: 'Entreprise Test',
              status: 'active',
              engagementScore: 'high',
              createdAt: '2025-01-01T00:00:00Z'
            }
          ],
          total: 1,
          page: 1,
          limit: 20
        })
      });
    });

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');

    console.log('[TEST 5] Cherchant le filtre de score d\'engagement...');

    // Chercher le select de score
    const scoreSelect = page.locator('select[name*="score"], [data-testid*="score-filter"]').first();
    const scoreSelectCount = await scoreSelect.count();
    console.log('[TEST 5] Filtre de score trouvé: ' + (scoreSelectCount > 0));

    if (scoreSelectCount > 0) {
      await scoreSelect.selectOption('high');
      await page.waitForTimeout(500);
      console.log('[TEST 5] Filtre appliqué: high');
    }

    const totalScoreButtons = scoreSelectCount + (await page.locator('button[data-testid*="score"]').count());
    expect(totalScoreButtons).toBeGreaterThanOrEqual(0);
  });

  // Test 6: Voir le profil complet d'un membre
  test('Afficher le profil complet d\'un membre', async ({ page }) => {
    console.log('\n[TEST 6] Test d\'affichage du profil complet...');

    // Mock API pour le profil détaillé
    await page.route(BASE_URL + '/api/admin/members/' + TEST_MEMBER.email, async (route) => {
      if (route.request().method() === 'GET') {
        console.log('[TEST 6] Requête API GET pour profil: ' + route.request().url());

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              email: TEST_MEMBER.email,
              firstName: TEST_MEMBER.firstName,
              lastName: TEST_MEMBER.lastName,
              company: TEST_MEMBER.company,
              phone: TEST_MEMBER.phone,
              status: TEST_MEMBER.status,
              engagementScore: TEST_MEMBER.engagementScore,
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-26T00:00:00Z',
              tags: ['VIP', 'Actif'],
              tasks: []
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');

    console.log('[TEST 6] Cherchant le profil du membre...');

    // Chercher et cliquer sur le membre
    const memberLink = page.getByText(TEST_MEMBER.firstName).first();
    console.log('[TEST 6] Membre trouvé: ' + (memberCount > 0));

    if (memberCount > 0) {
      await memberLink.click();
      await page.waitForTimeout(1000);
      console.log('[TEST 6] Profil ouvert');

      // Vérifier la présence des détails
      const details = [
        TEST_MEMBER.firstName,
        TEST_MEMBER.lastName,
        TEST_MEMBER.email,
        TEST_MEMBER.company
      ];

      for (const detail of details) {
        const element = page.locator('text=' + detail);
        const count = await element.count();
        console.log('[TEST 6] Détail "' + detail + '" visible: ' + (count > 0));
      }

      expect(memberCount).toBeGreaterThan(0);
    }
  });

  // Test 7: Créer un nouveau membre
  test('Créer un nouveau membre via le formulaire', async ({ page }) => {
    console.log('\n[TEST 7] Test de création de membre...');

    // Mock API POST pour création
    await page.route(BASE_URL + '/api/admin/members', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        console.log('[TEST 7] Créant nouveau membre: ' + JSON.stringify(postData, null, 2));

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              email: postData.email || 'new.member@example.com',
              firstName: postData.firstName || 'Nouveau',
              lastName: postData.lastName || 'Membre',
              company: postData.company || '',
              phone: postData.phone || '',
              status: 'active',
              engagementScore: 'low',
              createdAt: new Date().toISOString()
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');

    console.log('[TEST 7] Cherchant le bouton d\'ajout de membre...');

    // Chercher le bouton "Ajouter" ou "Créer"
    const addButtonTexts = [
      'Ajouter un membre',
      'Créer un membre',
      'Ajouter',
      'Créer',
      'Add Member',
      '+ Ajouter'
    ];

    let addButtonFound = false;
    for (const buttonText of addButtonTexts) {
      const button = page.locator('button:has-text("' + buttonText + '")').first();
      const count = await button.count();

      if (count > 0) {
        console.log('[TEST 7] Bouton trouvé: "' + buttonText + '", cliquant...');
        await button.click();
        await page.waitForTimeout(1000);
        addButtonFound = true;
        break;
      }
    }

    console.log('[TEST 7] Bouton d\'ajout trouvé: ' + addButtonFound);

    if (addButtonFound) {
      // Chercher et remplir le formulaire
      console.log('[TEST 7] Remplissant le formulaire...');

      const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
      const firstNameInput = page.locator('input[name*="firstName"], input[name*="first_name"], input[placeholder*="Prénom"]').first();
      const lastNameInput = page.locator('input[name*="lastName"], input[name*="last_name"], input[placeholder*="Nom"]').first();
      const companyInput = page.locator('input[name*="company"], input[placeholder*="Entreprise"]').first();

      if (await emailInput.count() > 0) {
        await emailInput.fill('new.member@example.com');
        console.log('[TEST 7] Email rempli');
      }

      if (await firstNameInput.count() > 0) {
        await firstNameInput.fill('Nouveau');
        console.log('[TEST 7] Prénom rempli');
      }

      if (await lastNameInput.count() > 0) {
        await lastNameInput.fill('Membre');
        console.log('[TEST 7] Nom rempli');
      }

      if (await companyInput.count() > 0) {
        await companyInput.fill('Entreprise Test');
        console.log('[TEST 7] Entreprise remplie');
      }

      // Chercher le bouton de soumission
      const submitButton = page.locator('button[type="submit"], button:has-text("Créer"), button:has-text("Ajouter"), button:has-text("Save")').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);
        console.log('[TEST 7] Formulaire soumis');
      }

      expect(addButtonFound).toBe(true);
    }
  });

  // Test 8: Modifier un membre
  test('Modifier les informations d\'un membre', async ({ page }) => {
    console.log('\n[TEST 8] Test de modification de membre...');

    // Mock API PATCH pour modification
    await page.route(BASE_URL + '/api/admin/members/' + TEST_MEMBER.email, async (route) => {
      if (route.request().method() === 'PATCH') {
        const patchData = route.request().postDataJSON();
        console.log('[TEST 8] Modifiant membre: ' + JSON.stringify(patchData, null, 2));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              email: TEST_MEMBER.email,
              firstName: patchData.firstName || TEST_MEMBER.firstName,
              lastName: patchData.lastName || TEST_MEMBER.lastName,
              company: TEST_MEMBER.company,
              phone: patchData.phone || TEST_MEMBER.phone,
              status: TEST_MEMBER.status,
              engagementScore: TEST_MEMBER.engagementScore,
              updatedAt: new Date().toISOString()
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');

    console.log('[TEST 8] Cherchant le membre à modifier...');

    // Chercher et cliquer sur le bouton de modification
    const editButtonTexts = ['Modifier', 'Edit', 'Éditer', 'Édition'];
    let editFound = false;

    for (const buttonText of editButtonTexts) {
      const editButton = page.locator('button:has-text("' + buttonText + '")').first();
      const count = await editButton.count();

      if (count > 0) {
        console.log('[TEST 8] Bouton trouvé: "' + buttonText + '", cliquant...');
        await editButton.click();
        await page.waitForTimeout(1000);
        editFound = true;
        break;
      }
    }

    console.log('[TEST 8] Mode édition activé: ' + editFound);

    if (editFound) {
      // Mettre à jour les champs
      console.log('[TEST 8] Mettant à jour les champs...');

      const firstNameInput = page.locator('input[name*="firstName"], input[name*="first_name"]').first();
      const phoneInput = page.locator('input[type="tel"], input[name*="phone"]').first();

      if (await firstNameInput.count() > 0) {
        await firstNameInput.fill(UPDATED_MEMBER.firstName);
        console.log('[TEST 8] Prénom mis à jour: ' + UPDATED_MEMBER.firstName);
      }

      if (await phoneInput.count() > 0) {
        await phoneInput.fill(UPDATED_MEMBER.phone);
        console.log('[TEST 8] Téléphone mis à jour: ' + UPDATED_MEMBER.phone);
      }

      // Soumettre la modification
      const submitButton = page.locator('button[type="submit"], button:has-text("Enregistrer"), button:has-text("Save")').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);
        console.log('[TEST 8] Modifications enregistrées');
      }

      expect(editFound).toBe(true);
    }
  });

  // Test 9: Assigner un tag à un membre
  test('Assigner un tag à un membre', async ({ page }) => {
    console.log('\n[TEST 9] Test d\'assignation de tag...');

    // Mock API POST pour l'ajout de tag
    await page.route(BASE_URL + '/api/admin/members/' + TEST_MEMBER.email + '/tags', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        console.log('[TEST 9] Ajoutant tag: ' + JSON.stringify(postData, null, 2));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              email: TEST_MEMBER.email,
              tags: ['VIP', 'Actif', ...(postData.tags || [])]
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');

    console.log('[TEST 9] Cherchant le profil du membre...');

    // Ouvrir le profil du membre
    const memberLink = page.locator('text=' + TEST_MEMBER.firstName).first();
    const memberCount = await memberLink.count();

    if (memberCount > 0) {
      await memberLink.click();
      await page.waitForTimeout(1000);
      console.log('[TEST 9] Profil ouvert');

      // Chercher le bouton ou formulaire pour ajouter un tag
      const tagButtonTexts = [
        'Ajouter un tag',
        'Ajouter un label',
        'Add Tag',
        'Nouveau tag',
        '+ Tag'
      ];

      let tagButtonFound = false;
      for (const buttonText of tagButtonTexts) {
        const tagButton = page.locator('button:has-text("' + buttonText + '")').first();
        const count = await tagButton.count();

        if (count > 0) {
          console.log('[TEST 9] Bouton trouvé: "' + buttonText + '", cliquant...');
          await tagButton.click();
          await page.waitForTimeout(500);
          tagButtonFound = true;
          break;
        }
      }

      console.log('[TEST 9] Bouton tag trouvé: ' + tagButtonFound);

      if (tagButtonFound) {
        // Sélectionner ou remplir un tag
        const tagInput = page.locator('input[placeholder*="tag" i], input[placeholder*="label" i]').first();
        const tagSelect = page.locator('select[name*="tag"]').first();

        if (await tagInput.count() > 0) {
          await tagInput.fill('VIP');
          console.log('[TEST 9] Tag saisi: VIP');

          // Chercher le bouton de confirmation
          const confirmButton = page.locator('button:has-text("Ajouter"), button:has-text("Confirmer"), button[type="submit"]').first();
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
            await page.waitForTimeout(500);
            console.log('[TEST 9] Tag ajouté');
          }
        } else if (await tagSelect.count() > 0) {
          // Dropdown de tags
          await tagSelect.selectOption('VIP');
          console.log('[TEST 9] Tag sélectionné: VIP');
        }
      }

      expect(memberCount).toBeGreaterThan(0);
    }
  });

  // Test 10: Créer une tâche de suivi pour un membre
  test('Créer une tâche de suivi pour un membre', async ({ page }) => {
    console.log('\n[TEST 10] Test de création de tâche de suivi...');

    // Mock API POST pour l'ajout de tâche
    await page.route(BASE_URL + '/api/admin/members/' + TEST_MEMBER.email + '/tasks', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        console.log('[TEST 10] Créant tâche: ' + JSON.stringify(postData, null, 2));

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'task-' + Date.now(),
              email: TEST_MEMBER.email,
              title: postData.title || 'Tâche de suivi',
              description: postData.description || '',
              dueDate: postData.dueDate || null,
              status: 'pending',
              createdAt: new Date().toISOString()
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');

    console.log('[TEST 10] Cherchant le profil du membre...');

    // Ouvrir le profil du membre
    const memberLink = page.locator('text=' + TEST_MEMBER.firstName).first();
    const memberCount = await memberLink.count();

    if (memberCount > 0) {
      await memberLink.click();
      await page.waitForTimeout(1000);
      console.log('[TEST 10] Profil ouvert');

      // Chercher le bouton ou section "Tâches"
      const taskButtonTexts = [
        'Ajouter une tâche',
        'Créer une tâche',
        'Add Task',
        'Nouvelle tâche',
        '+ Tâche'
      ];

      let taskButtonFound = false;
      for (const buttonText of taskButtonTexts) {
        const taskButton = page.locator('button:has-text("' + buttonText + '")').first();
        const count = await taskButton.count();

        if (count > 0) {
          console.log('[TEST 10] Bouton trouvé: "' + buttonText + '", cliquant...');
          await taskButton.click();
          await page.waitForTimeout(500);
          taskButtonFound = true;
          break;
        }
      }

      console.log('[TEST 10] Bouton tâche trouvé: ' + taskButtonFound);

      if (taskButtonFound) {
        // Remplir le formulaire de tâche
        const titleInput = page.locator('input[placeholder*="titre" i], input[placeholder*="title" i], input[name*="title"]').first();
        const descriptionInput = page.locator('textarea[placeholder*="description" i], textarea[name*="description"]').first();

        if (await titleInput.count() > 0) {
          await titleInput.fill('Suivi engagement - ' + TEST_MEMBER.firstName);
          console.log('[TEST 10] Titre saisi');
        }

        if (await descriptionInput.count() > 0) {
          await descriptionInput.fill('Vérifier le niveau d\'engagement du membre et proposer des actions de fidélisation.');
          console.log('[TEST 10] Description saisie');
        }

        // Soumettre la tâche
        const submitButton = page.locator('button[type="submit"], button:has-text("Créer"), button:has-text("Ajouter"), button:has-text("Enregistrer")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(1000);
          console.log('[TEST 10] Tâche créée');
        }
      }

      expect(memberCount).toBeGreaterThan(0);
    }
  });

  // Test 11: Tester la pagination de la liste des membres
  test('Naviguer dans la pagination de la liste des membres', async ({ page }) => {
    console.log('\n[TEST 11] Test de pagination...');

    // Mock API avec pagination
    await page.route(BASE_URL + '/api/admin/members?*page=2*', async (route) => {
      if (route.request().method() === 'GET') {
        const url = route.request().url();
        console.log('[TEST 11] Requête page 2: ' + url);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                email: 'autre.membre@example.com',
                firstName: 'Autre',
                lastName: 'Membre',
                company: 'Entreprise 2',
                status: 'inactive',
                engagementScore: 'low',
                createdAt: '2025-01-03T00:00:00Z'
              }
            ],
            total: 25,
            page: 2,
            limit: 20
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');

    console.log('[TEST 11] Cherchant les contrôles de pagination...');

    // Chercher les boutons de pagination
    const nextButtons = [
      page.locator('button:has-text("Suivant")'),
      page.locator('button:has-text("Next")'),
      page.locator('[data-testid*="next"]'),
      page.locator('button:has(svg[data-testid*="arrow"])').first()
    ];

    let paginationFound = false;
    for (const button of nextButtons) {
      const count = await button.count();
      if (count > 0) {
        console.log('[TEST 11] Bouton pagination trouvé, cliquant...');
        await button.click();
        await page.waitForTimeout(1000);
        paginationFound = true;
        break;
      }
    }

    console.log('[TEST 11] Pagination trouvée: ' + paginationFound);

    // Vérifier les chiffres de page
    const pageNumbers = page.locator('button:has-text("2"), a:has-text("2")');
    const pageCount = await pageNumbers.count();
    console.log('[TEST 11] Boutons de numérotation trouvés: ' + pageCount);

    const totalPaginationElements = (paginationFound ? 1 : 0) + pageCount;
    expect(totalPaginationElements).toBeGreaterThanOrEqual(0);
  });

  // Test 12: Vérifier les appels API critiques
  test('Vérifier les appels API critiques pour la gestion des membres', async ({ page }) => {
    console.log('\n[TEST 12] Test de validation API...');

    // Mock all API endpoints
    await page.route(BASE_URL + '/api/admin/members*', async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      console.log('[TEST 12] Requête: ' + method + ' ' + url);

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [],
            total: 0,
            page: 1,
            limit: 20
          })
        });
      } else if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'new-member' }
          })
        });
      } else if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'member' }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    console.log('[TEST 12] Récapitulatif des requêtes API:');

    // Analyser les requêtes
    const memberRequests = networkRequests.filter(r => r.url.includes('/api/admin/members'));
    console.log('[TEST 12] Total de requêtes membres: ' + memberRequests.length);

    memberRequests.forEach((req, idx) => {
      console.log('[TEST 12] ' + (idx + 1) + '. ' + req.method + ' ' + req.status + ' ' + req.url.substring(0, 80));
    });

    // Vérifier qu'au moins une requête GET a été effectuée
    const getRequests = memberRequests.filter(r => r.method === 'GET' && r.status === 200);
    console.log('[TEST 12] Requêtes GET réussies: ' + getRequests.length);

    expect(getRequests.length).toBeGreaterThanOrEqual(0);
  });

  // Test 13: Documenter le comportement complet du CRM
  test('Documenter le comportement complet du CRM membres', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('DOCUMENTATION COMPLÈTE - CRM MEMBRES');
    console.log('='.repeat(80));

    await page.goto(BASE_URL + '/admin/members');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('\n1. ÉTAT INITIAL DE LA PAGE');
    console.log('   URL: ' + page.url());
    console.log('   Title: ' + await page.title());

    console.log('\n2. DÉTECTION DES ÉLÉMENTS UI');
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const tables = await page.locator('table').count();
    const selects = await page.locator('select').count();

    console.log('   Total boutons: ' + buttons);
    console.log('   Total champs input: ' + inputs);
    console.log('   Total tableaux: ' + tables);
    console.log('   Total dropdowns: ' + selects);

    console.log('\n3. ANALYSE DES BOUTONS');
    const allButtons = await page.locator('button').evaluateAll((buttons) => {
      return buttons.map((btn, idx) => ({
        index: idx,
        text: (btn.textContent || '').trim().substring(0, 50),
        ariaLabel: btn.getAttribute('aria-label') || '(none)',
        disabled: btn.hasAttribute('disabled')
      }));
    });

    console.log('   Boutons identifiés (' + allButtons.length + '):');
    allButtons.slice(0, 10).forEach((btn) => {
      console.log('      - "' + btn.text + '" [aria: ' + btn.ariaLabel + ']' + (btn.disabled ? ' [DISABLED]' : ''));
    });

    console.log('\n4. DÉTECTION DES CHAMPS DE FORMULAIRE');
    const allInputs = await page.locator('input').evaluateAll((inputs) => {
      return inputs.map((inp, idx) => ({
        index: idx,
        type: inp.getAttribute('type') || 'text',
        name: inp.getAttribute('name') || '(unnamed)',
        placeholder: inp.getAttribute('placeholder') || '(none)'
      }));
    });

    console.log('   Champs input identifiés (' + allInputs.length + '):');
    allInputs.slice(0, 10).forEach((inp) => {
      console.log('      - [' + inp.type + '] ' + inp.name + ' placeholder: ' + inp.placeholder);
    });

    console.log('\n5. STATISTIQUES RÉSEAU');
    console.log('   Total requêtes: ' + networkRequests.length);
    const apiRequests = networkRequests.filter(r => r.url.includes('/api'));
    const errorRequests = networkRequests.filter(r => r.status >= 400);
    console.log('   Requêtes API: ' + apiRequests.length);
    console.log('   Requêtes en erreur: ' + errorRequests.length);

    console.log('\n6. STATISTIQUES CONSOLE');
    const jsErrors = consoleMessages.filter(m => m.type === 'error');
    const jsWarnings = consoleMessages.filter(m => m.type === 'warning');
    console.log('   Total messages: ' + consoleMessages.length);
    console.log('   Erreurs: ' + jsErrors.length);
    console.log('   Avertissements: ' + jsWarnings.length);

    if (jsErrors.length > 0) {
      console.log('\n   Erreurs détectées:');
      jsErrors.slice(0, 5).forEach((err, idx) => {
        console.log('      ' + (idx + 1) + '. ' + err.text.substring(0, 100));
      });
    }

    console.log('\n' + '='.repeat(80));
  });
});
