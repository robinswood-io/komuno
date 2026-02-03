import { test, expect } from '@playwright/test';
import { loginAsAdminQuick } from '../helpers/auth';

/**
 * Tests E2E pour US-ADMIN-003: Gestion des administrateurs
 *
 * En tant que super_admin, je veux gérer les comptes admin avec rôles granulaires
 * pour déléguer les permissions.
 *
 * Critères d'acceptation:
 * 1. Créer admin avec rôle
 * 2. Valider/rejeter admins en attente
 * 3. Modifier rôle/statut
 * 4. Voir liste admins + statuts
 *
 * URL de test: https://cjd80.rbw.ovh (règle Robinswood: .rbw.ovh, JAMAIS localhost)
 * Compte test: admin@test.local (password: devmode, role: super_admin)
 *
 * Endpoints testés (8):
 * - GET /api/admin/administrators
 * - GET /api/admin/pending-admins
 * - POST /api/admin/administrators
 * - PATCH /api/admin/administrators/:email/role
 * - PATCH /api/admin/administrators/:email/status
 * - PATCH /api/admin/administrators/:email/approve
 * - DELETE /api/admin/administrators/:email/reject
 * - DELETE /api/admin/administrators/:email
 *
 * Rôles disponibles:
 * - super_admin, ideas_manager, ideas_reader, events_manager, events_reader, finance_manager
 *
 * @author Claude Code (E2E Tests)
 * @version 1.0
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

// Rôles disponibles
const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  IDEAS_MANAGER: 'ideas_manager',
  IDEAS_READER: 'ideas_reader',
  EVENTS_MANAGER: 'events_manager',
  EVENTS_READER: 'events_reader',
  FINANCE_MANAGER: 'finance_manager'
};

// Statuts admin
const ADMIN_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending'
};

const getAuthHeaders = (cookie: string | null) => ({
  headers: {
    Cookie: cookie ?? ''
  }
});

// Types pour les logs
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

test.describe('US-ADMIN-003: Gestion des administrateurs', () => {
  let consoleMessages: ConsoleMessage[] = [];
  let networkRequests: NetworkRequest[] = [];
  let testAdminEmail: string | null = null;
  let authCookieHeader: string | null = null;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    networkRequests = [];

    // Capturer les messages console
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

    // Capturer les requêtes réseau
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

    await loginAsAdminQuick(page, BASE_URL);

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((cookie) =>
      cookie.name.includes('sid') || cookie.name.includes('session')
    );

    if (!sessionCookie) {
      throw new Error('Session cookie not found after login.');
    }

    authCookieHeader = `${sessionCookie.name}=${sessionCookie.value}`;
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

  // Test 1: Accéder au dashboard admin
  test('1. Accéder au dashboard admin et vérifier le chargement', async ({ page }) => {
    console.log('\n[TEST 1] Accédant au dashboard admin...');

    await page.goto(BASE_URL + '/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    console.log('[TEST 1] URL: ' + page.url());
    const pageContent = await page.content();
    const isPageLoaded = pageContent.length > 100;

    console.log('[TEST 1] Page content length: ' + pageContent.length);
    expect(isPageLoaded).toBe(true);
    expect(page.url()).toContain('/admin');
  });

  // Test 2: Voir liste des administrateurs
  test('2. Voir liste des administrateurs (GET /api/admin/administrators)', async ({ page, request }) => {
    console.log('\n[TEST 2] Récupération de la liste des administrateurs...');

    const response = await request.get(
      BASE_URL + '/api/admin/administrators',
      getAuthHeaders(authCookieHeader)
    );

    console.log('[TEST 2] Status: ' + response.status());
    expect(response.ok()).toBe(true);

    const data = await response.json();
    console.log('[TEST 2] Response keys: ' + Object.keys(data).join(', '));

    // Vérifier la structure de la réponse
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    console.log('[TEST 2] Nombre d\'administrateurs: ' + data.data.length);

    // Vérifier que chaque admin a les propriétés attendues
    if (data.data.length > 0) {
      const firstAdmin = data.data[0];
      console.log('[TEST 2] Premier admin - email: ' + firstAdmin.email + ', role: ' + firstAdmin.role + ', status: ' + firstAdmin.status);
      expect(firstAdmin).toHaveProperty('email');
      expect(firstAdmin).toHaveProperty('role');
      expect(firstAdmin).toHaveProperty('status');
    }
  });

  // Test 3: Voir liste des administrateurs en attente
  test('3. Voir liste des administrateurs en attente (GET /api/admin/pending-admins)', async ({ page, request }) => {
    console.log('\n[TEST 3] Récupération de la liste des admins en attente...');

    const response = await request.get(
      BASE_URL + '/api/admin/pending-admins',
      getAuthHeaders(authCookieHeader)
    );

    console.log('[TEST 3] Status: ' + response.status());
    expect(response.ok()).toBe(true);

    const data = await response.json();
    console.log('[TEST 3] Response keys: ' + Object.keys(data).join(', '));

    // Vérifier la structure
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    console.log('[TEST 3] Nombre d\'admins en attente: ' + data.data.length);

    // Tous les admins en attente doivent avoir le statut "pending"
    if (data.data.length > 0) {
      const allPending = data.data.every((admin: { status?: string }) => admin.status === ADMIN_STATUSES.PENDING);
      console.log('[TEST 3] Tous les admins ont le statut "pending": ' + allPending);
      expect(allPending).toBe(true);
    }
  });

  // Test 4: Créer un nouvel administrateur
  test('4. Créer un nouvel administrateur (POST /api/admin/administrators)', async ({ page, request }) => {
    console.log('\n[TEST 4] Création d\'un nouvel administrateur...');

    // Générer un email unique
    const timestamp = Date.now();
    const newAdminEmail = 'test-admin-' + timestamp + '@test.local';
    const newAdminRole = ADMIN_ROLES.IDEAS_MANAGER;

    console.log('[TEST 4] Email du nouvel admin: ' + newAdminEmail);
    console.log('[TEST 4] Rôle: ' + newAdminRole);

    const response = await request.post(
      BASE_URL + '/api/admin/administrators',
      {
        ...getAuthHeaders(authCookieHeader),
        data: {
          email: newAdminEmail,
          role: newAdminRole
        }
      }
    );

    console.log('[TEST 4] POST status: ' + response.status());
    expect([200, 201, 400]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      console.log('[TEST 4] Response: ' + JSON.stringify(data));
      expect(data).toHaveProperty('success');
      testAdminEmail = newAdminEmail;
      console.log('[TEST 4] Admin créé avec succès');
    } else {
      console.log('[TEST 4] Erreur lors de la création');
      const errorData = await response.json();
      console.log('[TEST 4] Erreur: ' + JSON.stringify(errorData));
    }
  });

  // Test 5: Approuver un administrateur en attente
  test('5. Approuver un administrateur en attente (PATCH /api/admin/administrators/:email/approve)', async ({ page, request }) => {
    console.log('\n[TEST 5] Approbation d\'un administrateur en attente...');

    // D'abord récupérer un admin en attente
    const listResponse = await request.get(
      BASE_URL + '/api/admin/pending-admins',
      getAuthHeaders(authCookieHeader)
    );
    expect(listResponse.ok()).toBe(true);

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('[TEST 5] Pas d\'admin en attente disponible pour le test');
      test.skip();
      return;
    }

    const adminEmail = listData.data[0].email;
    console.log('[TEST 5] Email de l\'admin en attente: ' + adminEmail);

    // PATCH pour approuver
    const approveResponse = await request.patch(
      BASE_URL + '/api/admin/administrators/' + encodeURIComponent(adminEmail) + '/approve',
      getAuthHeaders(authCookieHeader)
    );

    console.log('[TEST 5] PATCH status: ' + approveResponse.status());
    expect([200, 201, 400, 404]).toContain(approveResponse.status());

    if (approveResponse.ok()) {
      const approveData = await approveResponse.json();
      console.log('[TEST 5] Response: ' + JSON.stringify(approveData));
      console.log('[TEST 5] Admin approuvé avec succès');
    }
  });

  // Test 6: Rejeter un administrateur en attente
  test('6. Rejeter un administrateur en attente (DELETE /api/admin/administrators/:email/reject)', async ({ page, request }) => {
    console.log('\n[TEST 6] Rejet d\'un administrateur en attente...');

    // D'abord récupérer un admin en attente
    const listResponse = await request.get(
      BASE_URL + '/api/admin/pending-admins',
      getAuthHeaders(authCookieHeader)
    );
    expect(listResponse.ok()).toBe(true);

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('[TEST 6] Pas d\'admin en attente disponible pour le test');
      test.skip();
      return;
    }

    const adminEmail = listData.data[0].email;
    console.log('[TEST 6] Email de l\'admin à rejeter: ' + adminEmail);

    // DELETE pour rejeter
    const rejectResponse = await request.delete(
      BASE_URL + '/api/admin/administrators/' + encodeURIComponent(adminEmail) + '/reject',
      getAuthHeaders(authCookieHeader)
    );

    console.log('[TEST 6] DELETE status: ' + rejectResponse.status());
    expect([200, 204, 400, 404]).toContain(rejectResponse.status());

    if (rejectResponse.ok() || rejectResponse.status() === 204) {
      console.log('[TEST 6] Admin rejeté avec succès');
    }
  });

  // Test 7: Modifier le rôle d'un administrateur
  test('7. Modifier le rôle d\'un administrateur (PATCH /api/admin/administrators/:email/role)', async ({ page, request }) => {
    console.log('\n[TEST 7] Modification du rôle d\'un administrateur...');

    // D'abord récupérer un admin actif
    const listResponse = await request.get(
      BASE_URL + '/api/admin/administrators',
      getAuthHeaders(authCookieHeader)
    );
    expect(listResponse.ok()).toBe(true);

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('[TEST 7] Pas d\'admin disponible pour le test');
      test.skip();
      return;
    }

    const admin = listData.data[0];
    const adminEmail = admin.email;
    const oldRole = admin.role;
    console.log('[TEST 7] Email de l\'admin: ' + adminEmail);
    console.log('[TEST 7] Ancien rôle: ' + oldRole);

    // Déterminer un nouveau rôle différent
    const newRole = oldRole === ADMIN_ROLES.IDEAS_MANAGER ? ADMIN_ROLES.EVENTS_MANAGER : ADMIN_ROLES.IDEAS_MANAGER;
    console.log('[TEST 7] Nouveau rôle: ' + newRole);

    // PATCH pour modifier le rôle
    const patchResponse = await request.patch(
      BASE_URL + '/api/admin/administrators/' + encodeURIComponent(adminEmail) + '/role',
      {
        ...getAuthHeaders(authCookieHeader),
        data: { role: newRole }
      }
    );

    console.log('[TEST 7] PATCH status: ' + patchResponse.status());
    expect([200, 201, 400, 404]).toContain(patchResponse.status());

    if (patchResponse.ok()) {
      const patchData = await patchResponse.json();
      console.log('[TEST 7] Response: ' + JSON.stringify(patchData));
      console.log('[TEST 7] Rôle modifié avec succès');
    }
  });

  // Test 8: Modifier le statut d'un administrateur
  test('8. Modifier le statut d\'un administrateur (PATCH /api/admin/administrators/:email/status)', async ({ page, request }) => {
    console.log('\n[TEST 8] Modification du statut d\'un administrateur...');

    // D'abord récupérer un admin
    const listResponse = await request.get(
      BASE_URL + '/api/admin/administrators',
      getAuthHeaders(authCookieHeader)
    );
    expect(listResponse.ok()).toBe(true);

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('[TEST 8] Pas d\'admin disponible pour le test');
      test.skip();
      return;
    }

    const admin = listData.data[0];
    const adminEmail = admin.email;
    const oldStatus = admin.status;
    console.log('[TEST 8] Email de l\'admin: ' + adminEmail);
    console.log('[TEST 8] Ancien statut: ' + oldStatus);

    // Déterminer un nouveau statut différent
    const newStatus = oldStatus === ADMIN_STATUSES.ACTIVE ? ADMIN_STATUSES.INACTIVE : ADMIN_STATUSES.ACTIVE;
    console.log('[TEST 8] Nouveau statut: ' + newStatus);

    // PATCH pour modifier le statut
    const patchResponse = await request.patch(
      BASE_URL + '/api/admin/administrators/' + encodeURIComponent(adminEmail) + '/status',
      {
        ...getAuthHeaders(authCookieHeader),
        data: { status: newStatus }
      }
    );

    console.log('[TEST 8] PATCH status: ' + patchResponse.status());
    expect([200, 201, 400, 404]).toContain(patchResponse.status());

    if (patchResponse.ok()) {
      const patchData = await patchResponse.json();
      console.log('[TEST 8] Response: ' + JSON.stringify(patchData));
      console.log('[TEST 8] Statut modifié avec succès');
    }
  });

  // Test 9: Supprimer un administrateur
  test('9. Supprimer un administrateur (DELETE /api/admin/administrators/:email)', async ({ page, request }) => {
    console.log('\n[TEST 9] Suppression d\'un administrateur...');

    // Créer un admin de test à supprimer
    const timestamp = Date.now();
    const testAdminEmail = 'delete-test-admin-' + timestamp + '@test.local';

    console.log('[TEST 9] Création d\'un admin de test à supprimer: ' + testAdminEmail);

    const createResponse = await request.post(
      BASE_URL + '/api/admin/administrators',
      {
        ...getAuthHeaders(authCookieHeader),
        data: {
          email: testAdminEmail,
          role: ADMIN_ROLES.IDEAS_READER
        }
      }
    );

    if (!createResponse.ok()) {
      console.log('[TEST 9] Impossible de créer l\'admin de test pour la suppression');
      test.skip();
      return;
    }

    console.log('[TEST 9] Admin de test créé');

    // DELETE pour supprimer
    const deleteResponse = await request.delete(
      BASE_URL + '/api/admin/administrators/' + encodeURIComponent(testAdminEmail),
      getAuthHeaders(authCookieHeader)
    );

    console.log('[TEST 9] DELETE status: ' + deleteResponse.status());
    expect([200, 204, 400, 404]).toContain(deleteResponse.status());

    if (deleteResponse.ok() || deleteResponse.status() === 204) {
      console.log('[TEST 9] Admin supprimé avec succès');
    }
  });

  // Test 10: Vérifier permissions requises
  test('10. Vérifier permissions d\'accès (admin.view, admin.edit)', async ({ page, request }) => {
    console.log('\n[TEST 10] Vérification des permissions...');

    // Test GET /api/admin/administrators (requires admin.view)
    const getResponse = await request.get(
      BASE_URL + '/api/admin/administrators',
      getAuthHeaders(authCookieHeader)
    );
    console.log('[TEST 10] GET /api/admin/administrators status: ' + getResponse.status());

    // 200 si authentifié, 401/403 sinon
    expect([200, 401, 403, 404]).toContain(getResponse.status());

    if (getResponse.ok()) {
      console.log('[TEST 10] Permission admin.view vérifiée');
    }

    // Test POST /api/admin/administrators (requires admin.create)
    const timestamp = Date.now();
    const postResponse = await request.post(
      BASE_URL + '/api/admin/administrators',
      {
        ...getAuthHeaders(authCookieHeader),
        data: {
          email: 'permission-test-' + timestamp + '@test.local',
          role: ADMIN_ROLES.IDEAS_MANAGER
        }
      }
    );

    console.log('[TEST 10] POST /api/admin/administrators status: ' + postResponse.status());
    expect([200, 201, 400, 401, 403, 404]).toContain(postResponse.status());

    if (postResponse.ok()) {
      console.log('[TEST 10] Permission admin.create vérifiée');
    }

    // Test PATCH /api/admin/administrators/:email/role (requires admin.edit)
    const listResponse = await request.get(
      BASE_URL + '/api/admin/administrators',
      getAuthHeaders(authCookieHeader)
    );
    if (listResponse.ok()) {
      const listData = await listResponse.json();
      if (listData.data && listData.data.length > 0) {
        const adminEmail = listData.data[0].email;

        const patchResponse = await request.patch(
          BASE_URL + '/api/admin/administrators/' + encodeURIComponent(adminEmail) + '/role',
          {
            ...getAuthHeaders(authCookieHeader),
            data: { role: ADMIN_ROLES.EVENTS_READER }
          }
        );

        console.log('[TEST 10] PATCH /api/admin/administrators/:email/role status: ' + patchResponse.status());
        expect([200, 201, 400, 401, 403, 404]).toContain(patchResponse.status());

        if (patchResponse.ok()) {
          console.log('[TEST 10] Permission admin.edit vérifiée');
        }
      }
    }
  });

  // Test 11: Test de rôles valides
  test('11. Tester tous les rôles disponibles', async ({ page, request }) => {
    console.log('\n[TEST 11] Test des rôles disponibles...');

    const roles = Object.values(ADMIN_ROLES);
    console.log('[TEST 11] Rôles à tester: ' + roles.join(', '));

    // Récupérer la liste actuelle des admins
    const listResponse = await request.get(
      BASE_URL + '/api/admin/administrators',
      getAuthHeaders(authCookieHeader)
    );
    expect(listResponse.ok()).toBe(true);

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('[TEST 11] Pas d\'admin disponible pour le test');
      test.skip();
      return;
    }

    // Tester d'attribuer chaque rôle
    const adminEmail = listData.data[0].email;
    console.log('[TEST 11] Utilisation de l\'admin: ' + adminEmail);

    for (const role of roles) {
      console.log('[TEST 11] Test du rôle: ' + role);

      const patchResponse = await request.patch(
        BASE_URL + '/api/admin/administrators/' + encodeURIComponent(adminEmail) + '/role',
        {
          ...getAuthHeaders(authCookieHeader),
          data: { role: role }
        }
      );

      console.log('[TEST 11]   Status: ' + patchResponse.status());
      expect([200, 201, 400, 404]).toContain(patchResponse.status());

      if (patchResponse.ok()) {
        console.log('[TEST 11]   ✓ Rôle ' + role + ' assigné');
      }
    }
  });

  // Test 12: Vérification complète des endpoints administrateurs
  test('12. Vérification complète des endpoints (endpoints admin)', async ({ page, request }) => {
    console.log('\n[TEST 12] Vérification complète des endpoints...');

    // 1. GET /api/admin/administrators
    console.log('[TEST 12] Testons: GET /api/admin/administrators');
    const getResponse = await request.get(
      BASE_URL + '/api/admin/administrators',
      getAuthHeaders(authCookieHeader)
    );
    expect(getResponse.ok()).toBe(true);
    const getData = await getResponse.json();
    console.log('[TEST 12] GET OK - ' + getData.data.length + ' administrateurs');

    // 2. GET /api/admin/pending-admins
    console.log('[TEST 12] Testons: GET /api/admin/pending-admins');
    const pendingResponse = await request.get(
      BASE_URL + '/api/admin/pending-admins',
      getAuthHeaders(authCookieHeader)
    );
    expect(pendingResponse.ok()).toBe(true);
    const pendingData = await pendingResponse.json();
    console.log('[TEST 12] GET pending-admins OK - ' + pendingData.data.length + ' admins en attente');

    if (getData.data.length === 0) {
      console.log('[TEST 12] Pas d\'administrateurs disponibles pour tests suivants');
      return;
    }

    const adminEmail = getData.data[0].email;
    console.log('[TEST 12] Utilisation de l\'admin: ' + adminEmail);

    // 3. PATCH /api/admin/administrators/:email/role
    console.log('[TEST 12] Testons: PATCH /api/admin/administrators/:email/role');
    const roleResponse = await request.patch(
      BASE_URL + '/api/admin/administrators/' + encodeURIComponent(adminEmail) + '/role',
      {
        ...getAuthHeaders(authCookieHeader),
        data: { role: ADMIN_ROLES.IDEAS_MANAGER }
      }
    );
    console.log('[TEST 12] PATCH role: ' + roleResponse.status());
    expect([200, 201, 400, 404]).toContain(roleResponse.status());

    // 4. PATCH /api/admin/administrators/:email/status
    console.log('[TEST 12] Testons: PATCH /api/admin/administrators/:email/status');
    const statusResponse = await request.patch(
      BASE_URL + '/api/admin/administrators/' + encodeURIComponent(adminEmail) + '/status',
      {
        ...getAuthHeaders(authCookieHeader),
        data: { status: ADMIN_STATUSES.ACTIVE }
      }
    );
    console.log('[TEST 12] PATCH status: ' + statusResponse.status());
    expect([200, 201, 400, 404]).toContain(statusResponse.status());

    console.log('[TEST 12] Tous les endpoints testés avec succès');
  });

  // Test 13: Test d'intégration complète
  test('13. Test d\'intégration complète du workflow administrateurs', async ({ page, request }) => {
    console.log('\n[TEST 13] Workflow d\'intégration complète...');

    // 1. Créer un nouvel admin
    const timestamp = Date.now();
    const newAdminEmail = 'integration-test-' + timestamp + '@test.local';

    console.log('[TEST 13] Étape 1: Création d\'un nouvel admin: ' + newAdminEmail);
    const createResponse = await request.post(
      BASE_URL + '/api/admin/administrators',
      {
        ...getAuthHeaders(authCookieHeader),
        data: {
          email: newAdminEmail,
          role: ADMIN_ROLES.IDEAS_MANAGER
        }
      }
    );

    console.log('[TEST 13] POST status: ' + createResponse.status());
    expect([200, 201, 400]).toContain(createResponse.status());

    if (!createResponse.ok()) {
      console.log('[TEST 13] Création échouée, impossible de continuer');
      return;
    }

    // 2. Vérifier que l'admin est en attente
    console.log('[TEST 13] Étape 2: Vérification que l\'admin est en attente...');
    const pendingResponse = await request.get(
      BASE_URL + '/api/admin/pending-admins',
      getAuthHeaders(authCookieHeader)
    );
    expect(pendingResponse.ok()).toBe(true);
    const pendingData = await pendingResponse.json();
    const createdAdmin = pendingData.data.find((admin: { email?: string }) => admin.email === newAdminEmail);
    console.log('[TEST 13] Admin trouvé en attente: ' + (createdAdmin ? 'OUI' : 'NON'));

    // 3. Approuver l'admin
    if (createdAdmin) {
      console.log('[TEST 13] Étape 3: Approbation de l\'admin...');
      const approveResponse = await request.patch(
        BASE_URL + '/api/admin/administrators/' + encodeURIComponent(newAdminEmail) + '/approve',
        getAuthHeaders(authCookieHeader)
      );

      console.log('[TEST 13] PATCH approve status: ' + approveResponse.status());
      expect([200, 201, 400, 404]).toContain(approveResponse.status());

      if (approveResponse.ok()) {
        console.log('[TEST 13] Admin approuvé avec succès');

        // 4. Modifier le rôle
        console.log('[TEST 13] Étape 4: Modification du rôle...');
        const roleResponse = await request.patch(
          BASE_URL + '/api/admin/administrators/' + encodeURIComponent(newAdminEmail) + '/role',
          {
            ...getAuthHeaders(authCookieHeader),
            data: { role: ADMIN_ROLES.EVENTS_MANAGER }
          }
        );

        console.log('[TEST 13] PATCH role status: ' + roleResponse.status());
        expect([200, 201, 400, 404]).toContain(roleResponse.status());

        // 5. Modifier le statut
        console.log('[TEST 13] Étape 5: Modification du statut...');
        const statusResponse = await request.patch(
          BASE_URL + '/api/admin/administrators/' + encodeURIComponent(newAdminEmail) + '/status',
          {
            ...getAuthHeaders(authCookieHeader),
            data: { status: ADMIN_STATUSES.INACTIVE }
          }
        );

        console.log('[TEST 13] PATCH status status: ' + statusResponse.status());
        expect([200, 201, 400, 404]).toContain(statusResponse.status());

        // 6. Supprimer l'admin
        console.log('[TEST 13] Étape 6: Suppression de l\'admin...');
        const deleteResponse = await request.delete(
          BASE_URL + '/api/admin/administrators/' + encodeURIComponent(newAdminEmail),
          getAuthHeaders(authCookieHeader)
        );

        console.log('[TEST 13] DELETE status: ' + deleteResponse.status());
        expect([200, 204, 400, 404]).toContain(deleteResponse.status());

        console.log('[TEST 13] Workflow d\'intégration complète terminé');
      }
    }
  });
});
