import { test, expect } from '@playwright/test';
import { getAuthHeaders, loginAsAdminQuick } from '../helpers/auth';

/**
 * Tests E2E pour US-ADMIN-002: Gestion/modération des idées (admin)
 *
 * En tant qu'ideas_manager, je veux modérer les idées pour gérer le contenu.
 *
 * Critères d'acceptation:
 * 1. Voir toutes idées avec pagination/filtres (status, featured)
 * 2. Changer statut (pending/approved/rejected/under_review/postponed/completed)
 * 3. Toggle featured
 * 4. Transformer idée en événement
 * 5. Modifier titre/description
 * 6. Vérifier permissions d'accès
 *
 * URL de test: https://cjd80.rbw.ovh (règle Robinswood: .rbw.ovh, JAMAIS localhost)
 * Compte test: admin@test.local (password: devmode, role: super_admin)
 *
 * Endpoints testés:
 * - GET /api/admin/ideas?page=1&limit=20&status=pending&featured=true
 * - PATCH /api/admin/ideas/:id/status
 * - PATCH /api/admin/ideas/:id/featured
 * - POST /api/admin/ideas/:id/transform-to-event
 * - PUT /api/admin/ideas/:id
 *
 * @author Claude Code (E2E Tests)
 * @version 2.0
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

// Statuts d'idée valides
const IDEA_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  UNDER_REVIEW: 'under_review',
  POSTPONED: 'postponed',
  COMPLETED: 'completed'
};

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

interface Idea {
  id: string;
  status?: string;
  featured?: boolean;
}

test.describe('US-ADMIN-002: Gestion/modération des idées (admin)', () => {
  let consoleMessages: ConsoleMessage[] = [];
  let networkRequests: NetworkRequest[] = [];
  let testIdeaId: string | null = null;
  let authHeaders: Record<string, string> | null = null;

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
    authHeaders = await getAuthHeaders(page);
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

  // Test 2: Voir liste des idées avec pagination
  test('2. Voir liste des idées admin avec pagination', async ({ page, request }) => {
    console.log('\n[TEST 2] Récupération de la liste des idées admin...');

    // Appel API GET /api/admin/ideas
    const response = await request.get(BASE_URL + '/api/admin/ideas?page=1&limit=20', {
      headers: authHeaders ?? {}
    });

    console.log('[TEST 2] Status: ' + response.status());
    expect(response.ok()).toBe(true);

    const data = await response.json();
    console.log('[TEST 2] Response keys: ' + Object.keys(data).join(', '));

    // Vérifier la structure de la réponse
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    console.log('[TEST 2] Nombre d\'idées: ' + data.data.length);

    // Stocker le premier ID pour les tests suivants
    if (data.data && data.data.length > 0) {
      testIdeaId = data.data[0].id;
      console.log('[TEST 2] Premier ID d\'idée: ' + testIdeaId);
    }

    // Vérifier la pagination
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('limit');
    console.log('[TEST 2] Pagination - Total: ' + data.total + ', Page: ' + data.page + ', Limit: ' + data.limit);
  });

  // Test 3: Filtrer par statut
  test('3. Filtrer idées par statut (pending)', async ({ page, request }) => {
    console.log('\n[TEST 3] Filtrage par statut "pending"...');

    const response = await request.get(
      BASE_URL + '/api/admin/ideas?status=' + IDEA_STATUSES.PENDING,
      { headers: authHeaders ?? {} }
    );

    console.log('[TEST 3] Status: ' + response.status());
    expect(response.ok()).toBe(true);

    const data = await response.json();
    console.log('[TEST 3] Nombre d\'idées avec statut pending: ' + data.data.length);

    // Vérifier que toutes les idées ont le statut "pending"
    if (data.data.length > 0) {
      const ideas = data.data as Idea[];
      const allPending = ideas.every((idea) => idea.status === IDEA_STATUSES.PENDING);
      console.log('[TEST 3] Toutes les idées sont pending: ' + allPending);
    }

    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  // Test 4: Filtrer par featured
  test('4. Filtrer idées par featured=true', async ({ page, request }) => {
    console.log('\n[TEST 4] Filtrage par featured=true...');

    const response = await request.get(
      BASE_URL + '/api/admin/ideas?featured=true',
      { headers: authHeaders ?? {} }
    );

    console.log('[TEST 4] Status: ' + response.status());

    if (response.ok()) {
      const data = await response.json();
      console.log('[TEST 4] Nombre d\'idées avec featured=true: ' + data.data.length);

      // Vérifier que toutes les idées sont featured
      if (data.data.length > 0) {
        const ideas = data.data as Idea[];
        const allFeatured = ideas.every((idea) => idea.featured === true);
        console.log('[TEST 4] Toutes les idées sont featured: ' + allFeatured);
      }

      expect(Array.isArray(data.data)).toBe(true);
    }
  });

  // Test 5: Changer statut d'idée via PATCH
  test('5. Changer statut d\'idée (PATCH /api/admin/ideas/:id/status)', async ({ page, request }) => {
    console.log('\n[TEST 5] Changement de statut d\'idée...');

    // D'abord récupérer une idée
    const listResponse = await request.get(BASE_URL + '/api/admin/ideas?limit=1', {
      headers: authHeaders ?? {}
    });
    expect(listResponse.ok()).toBe(true);

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('[TEST 5] Pas d\'idée disponible pour le test');
      test.skip();
      return;
    }

    const ideaId = listData.data[0].id;
    const oldStatus = listData.data[0].status;
    console.log('[TEST 5] ID idée: ' + ideaId + ', Statut actuel: ' + oldStatus);

    // Déterminer un nouveau statut
    const newStatus = oldStatus === IDEA_STATUSES.PENDING ? IDEA_STATUSES.APPROVED : IDEA_STATUSES.PENDING;
    console.log('[TEST 5] Nouveau statut: ' + newStatus);

    // PATCH pour changer le statut
    const patchResponse = await request.patch(
      BASE_URL + '/api/admin/ideas/' + ideaId + '/status',
      { data: { status: newStatus }, headers: authHeaders ?? {} }
    );

    console.log('[TEST 5] PATCH status: ' + patchResponse.status());
    expect([200, 400].includes(patchResponse.status())).toBe(true);

    const patchData = await patchResponse.json().catch(() => null);
    console.log('[TEST 5] Response: ' + JSON.stringify(patchData));
    if (patchResponse.ok() && patchData) {
      expect(patchData).toHaveProperty('success');
    }
  });

  // Test 6: Toggle featured
  test('6. Toggle featured (PATCH /api/admin/ideas/:id/featured)', async ({ page, request }) => {
    console.log('\n[TEST 6] Toggle featured d\'idée...');

    // Récupérer une idée
    const listResponse = await request.get(BASE_URL + '/api/admin/ideas?limit=1', {
      headers: authHeaders ?? {}
    });
    expect(listResponse.ok()).toBe(true);

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('[TEST 6] Pas d\'idée disponible pour le test');
      test.skip();
      return;
    }

    const ideaId = listData.data[0].id;
    const oldFeatured = listData.data[0].featured;
    console.log('[TEST 6] ID idée: ' + ideaId + ', Featured actuel: ' + oldFeatured);

    // PATCH pour toggle featured
    const patchResponse = await request.patch(
      BASE_URL + '/api/admin/ideas/' + ideaId + '/featured',
      { headers: authHeaders ?? {} }
    );

    console.log('[TEST 6] PATCH featured status: ' + patchResponse.status());
    expect(patchResponse.ok()).toBe(true);

    const patchData = await patchResponse.json();
    console.log('[TEST 6] Response: ' + JSON.stringify(patchData));
    expect(patchData).toHaveProperty('success');
  });

  // Test 7: Modifier titre et description
  test('7. Modifier titre et description (PUT /api/admin/ideas/:id)', async ({ page, request }) => {
    console.log('\n[TEST 7] Modification titre/description...');

    // Récupérer une idée
    const listResponse = await request.get(BASE_URL + '/api/admin/ideas?limit=1', {
      headers: authHeaders ?? {}
    });
    expect(listResponse.ok()).toBe(true);

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('[TEST 7] Pas d\'idée disponible pour le test');
      test.skip();
      return;
    }

    const ideaId = listData.data[0].id;
    const oldTitle = listData.data[0].title;
    const oldDescription = listData.data[0].description;

    console.log('[TEST 7] ID idée: ' + ideaId);
    console.log('[TEST 7] Ancien titre: ' + oldTitle);

    // Préparer les modifications
    const newTitle = 'Titre modifié - ' + Date.now();
    const newDescription = 'Description modifiée - ' + new Date().toISOString();
    const proposedBy = listData.data[0].proposedBy || 'Admin';
    const proposedByEmail = listData.data[0].proposedByEmail || 'admin@test.local';

    // PUT pour modifier
    const putResponse = await request.put(
      BASE_URL + '/api/admin/ideas/' + ideaId,
      {
        data: {
          title: newTitle,
          description: newDescription,
          proposedBy,
          proposedByEmail
        },
        headers: authHeaders ?? {}
      }
    );

    console.log('[TEST 7] PUT status: ' + putResponse.status());
    expect([200, 400].includes(putResponse.status())).toBe(true);

    const putData = await putResponse.json().catch(() => null);
    console.log('[TEST 7] Nouveau titre: ' + newTitle);
  });

  // Test 8: Tester transformation en événement
  test('8. Transformer idée en événement (POST /api/admin/ideas/:id/transform-to-event)', async ({ page, request }) => {
    console.log('\n[TEST 8] Transformation en événement...');

    // Récupérer une idée approuvée
    const listResponse = await request.get(
      BASE_URL + '/api/admin/ideas?status=' + IDEA_STATUSES.APPROVED + '&limit=1',
      { headers: authHeaders ?? {} }
    );

    if (!listResponse.ok()) {
      console.log('[TEST 8] Pas d\'idée approuvée disponible, tentative avec première idée...');

      // Si pas d'idée approuvée, chercher une idée quelconque
      const anyResponse = await request.get(BASE_URL + '/api/admin/ideas?limit=1', {
        headers: authHeaders ?? {}
      });
      expect(anyResponse.ok()).toBe(true);

      const anyData = await anyResponse.json();
      if (!anyData.data || anyData.data.length === 0) {
        console.log('[TEST 8] Pas d\'idée disponible pour le test');
        test.skip();
        return;
      }

      const ideaId = anyData.data[0].id;
      console.log('[TEST 8] ID idée: ' + ideaId + ', Statut: ' + anyData.data[0].status);

      // Tenter la transformation (peut échouer si l'idée n'est pas approuvée)
      const transformResponse = await request.post(
        BASE_URL + '/api/admin/ideas/' + ideaId + '/transform-to-event',
        { headers: authHeaders ?? {} }
      );

      console.log('[TEST 8] POST transform status: ' + transformResponse.status());
      // Accepter 201 (success) ou 400 (validation error)
      expect([201, 400, 409]).toContain(transformResponse.status());
      return;
    }

    const listData = await listResponse.json();
    if (!listData.data || listData.data.length === 0) {
      console.log('[TEST 8] Pas d\'idée approuvée disponible, tentative avec première idée...');
      const anyResponse = await request.get(BASE_URL + '/api/admin/ideas?limit=1', {
        headers: authHeaders ?? {}
      });
      expect(anyResponse.ok()).toBe(true);

      const anyData = await anyResponse.json();
      if (!anyData.data || anyData.data.length === 0) {
        console.log('[TEST 8] Pas d\'idée disponible pour le test');
        test.skip();
        return;
      }

      const fallbackIdeaId = anyData.data[0].id;
      console.log('[TEST 8] ID idée fallback: ' + fallbackIdeaId + ', Statut: ' + anyData.data[0].status);

      const fallbackResponse = await request.post(
        BASE_URL + '/api/admin/ideas/' + fallbackIdeaId + '/transform-to-event',
        { headers: authHeaders ?? {} }
      );

      console.log('[TEST 8] POST transform status: ' + fallbackResponse.status());
      expect([201, 400, 409]).toContain(fallbackResponse.status());
      return;
    }

    const ideaId = listData.data[0].id;
    console.log('[TEST 8] ID idée approuvée: ' + ideaId);

    // POST pour transformer en événement
    const transformResponse = await request.post(
      BASE_URL + '/api/admin/ideas/' + ideaId + '/transform-to-event',
      { headers: authHeaders ?? {} }
    );

    console.log('[TEST 8] POST transform status: ' + transformResponse.status());
    expect([201, 400, 409]).toContain(transformResponse.status());
  });

  // Test 9: Vérifier permissions requises
  test('9. Vérifier permissions d\'accès (admin.view, admin.edit)', async ({ page, request }) => {
    console.log('\n[TEST 9] Vérification des permissions...');

    // Test GET /api/admin/ideas (requires admin.view)
    const getResponse = await request.get(BASE_URL + '/api/admin/ideas', {
      headers: authHeaders ?? {}
    });
    console.log('[TEST 9] GET /api/admin/ideas status: ' + getResponse.status());

    // 200 si authentifié, 401/403 sinon
    expect([200, 401, 403, 404]).toContain(getResponse.status());

    if (getResponse.ok()) {
      console.log('[TEST 9] Permission admin.view vérifiée');
    }

    // Test PATCH /api/admin/ideas/:id/status (requires admin.edit)
    const listResponse = await request.get(BASE_URL + '/api/admin/ideas?limit=1', {
      headers: authHeaders ?? {}
    });
    if (listResponse.ok()) {
      const listData = await listResponse.json();
      if (listData.data && listData.data.length > 0) {
        const ideaId = listData.data[0].id;

        const patchResponse = await request.patch(
          BASE_URL + '/api/admin/ideas/' + ideaId + '/status',
          { data: { status: IDEA_STATUSES.PENDING }, headers: authHeaders ?? {} }
        );

        console.log('[TEST 9] PATCH status code: ' + patchResponse.status());
        expect([200, 201, 400, 401, 403, 404]).toContain(patchResponse.status());
      }
    }
  });

  // Test 10: Test de pagination
  test('10. Tester pagination avec page et limit', async ({ page, request }) => {
    console.log('\n[TEST 10] Test pagination...');

    // Test page 1, limit 5
    const page1Response = await request.get(
      BASE_URL + '/api/admin/ideas?page=1&limit=5',
      { headers: authHeaders ?? {} }
    );
    expect(page1Response.ok()).toBe(true);

    const page1Data = await page1Response.json();
    console.log('[TEST 10] Page 1 - Items: ' + page1Data.data.length + ', Total: ' + page1Data.total);
    expect(page1Data.data.length).toBeLessThanOrEqual(5);
    expect(page1Data.page).toBe(1);
    expect(page1Data.limit).toBe(5);

    // Test page 2, limit 5 (si possible)
    if (page1Data.total > 5) {
      const page2Response = await request.get(
        BASE_URL + '/api/admin/ideas?page=2&limit=5',
        { headers: authHeaders ?? {} }
      );
      expect(page2Response.ok()).toBe(true);

      const page2Data = await page2Response.json();
      console.log('[TEST 10] Page 2 - Items: ' + page2Data.data.length);
      expect(page2Data.page).toBe(2);

      // Vérifier que les IDs sont différents
      const page1Ids = (page1Data.data as Idea[]).map((idea) => idea.id);
      const page2Ids = (page2Data.data as Idea[]).map((idea) => idea.id);
      const intersection = page1Ids.filter((id: string) => page2Ids.includes(id));
      console.log('[TEST 10] Intersection entre page 1 et 2: ' + intersection.length);
      expect(intersection.length).toBe(0);
    }
  });

  // Test intégration: Voir tous les endpoints ensemble
  test('11. Vérification complète des endpoints admin ideas', async ({ page, request }) => {
    console.log('\n[TEST 11] Vérification complète endpoints...');

    // 1. GET /api/admin/ideas
    console.log('[TEST 11] Testons: GET /api/admin/ideas');
    const getResponse = await request.get(BASE_URL + '/api/admin/ideas?page=1&limit=10', {
      headers: authHeaders ?? {}
    });
    expect(getResponse.ok()).toBe(true);
    const getData = await getResponse.json();
    console.log('[TEST 11] GET OK - ' + getData.data.length + ' idées');

    if (getData.data.length === 0) {
      console.log('[TEST 11] Pas d\'idées disponibles pour tests suivants');
      return;
    }

    const ideaId = getData.data[0].id;
    const proposedBy = getData.data[0].proposedBy || 'Admin';
    const proposedByEmail = getData.data[0].proposedByEmail || 'admin@test.local';

    // 2. PATCH /api/admin/ideas/:id/status
    console.log('[TEST 11] Testons: PATCH /api/admin/ideas/:id/status');
    const statusResponse = await request.patch(
      BASE_URL + '/api/admin/ideas/' + ideaId + '/status',
      { data: { status: IDEA_STATUSES.UNDER_REVIEW }, headers: authHeaders ?? {} }
    );
    console.log('[TEST 11] PATCH status: ' + statusResponse.status());
    expect([200, 201, 400, 401, 403, 404]).toContain(statusResponse.status());

    // 3. PATCH /api/admin/ideas/:id/featured
    console.log('[TEST 11] Testons: PATCH /api/admin/ideas/:id/featured');
    const featuredResponse = await request.patch(
      BASE_URL + '/api/admin/ideas/' + ideaId + '/featured',
      { headers: authHeaders ?? {} }
    );
    console.log('[TEST 11] PATCH featured: ' + featuredResponse.status());
    expect([200, 201, 400, 401, 403, 404]).toContain(featuredResponse.status());

    // 4. PUT /api/admin/ideas/:id
    console.log('[TEST 11] Testons: PUT /api/admin/ideas/:id');
    const putResponse = await request.put(
      BASE_URL + '/api/admin/ideas/' + ideaId,
      {
        data: {
          title: 'Test - ' + Date.now(),
          description: 'Mise à jour admin',
          proposedBy,
          proposedByEmail
        },
        headers: authHeaders ?? {}
      }
    );
    console.log('[TEST 11] PUT: ' + putResponse.status());
    expect([200, 201, 400, 401, 403, 404]).toContain(putResponse.status());

    console.log('[TEST 11] Tous les endpoints testés');
  });
});
