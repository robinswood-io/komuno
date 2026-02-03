import { test, expect } from '@playwright/test';
import { loginAsAdminQuick } from '../helpers/auth';

/**
 * Tests E2E pour US-ADMIN-004: Système tickets développement (bug/feature)
 *
 * En tant qu'admin, je veux créer demandes développement (bug/feature)
 * synchronisées GitHub pour tracer améliorations.
 *
 * Tests couverts:
 * 1. Voir liste dev requests
 * 2. Créer bug report
 * 3. Créer feature request
 * 4. Filtrer par type (bug/feature)
 * 5. Filtrer par statut
 * 6. Modifier demande
 * 7. Synchroniser GitHub
 * 8. Changer statut
 * 9. Supprimer demande
 */

const BASE_URL = 'https://cjd80.rbw.ovh';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Navigate to development requests page
 */
async function navigateToDevRequests(page: Page) {
  await page.goto(`${BASE_URL}/admin/development-requests`);
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

/**
 * Extract session cookie for API calls
 */
function getSessionCookie(cookies: any[]) {
  return cookies.find(c => c.name.includes('sid') || c.name.includes('session'));
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe('Admin: Development Requests - Navigation & List', () => {

  test('1. devrait voir la page de gestion des development requests', async ({ page }) => {
    await loginAsAdminQuick(page);
    await navigateToDevRequests(page);

    // Vérifier présence du titre
    const title = page.locator('h1, h2').first();
    await expect(title).toBeVisible({ timeout: 5000 });

    // Vérifier présence du tableau ou liste
    const content = page.locator('table, [role="table"], [class*="list"], [class*="grid"]').first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test('API GET /api/admin/development-requests devrait retourner la liste', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    const response = await request.get(`${BASE_URL}/api/admin/development-requests`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
  });
});

test.describe('Admin: Development Requests - CRUD Operations', () => {

  test('2. devrait créer un bug report', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    const bugReport = {
      type: 'bug',
      title: 'Bouton login non cliquable sur mobile',
      description: 'Le bouton de connexion ne répond pas sur écran iPhone 12',
      priority: 'high'
    };

    const response = await request.post(`${BASE_URL}/api/admin/development-requests`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: bugReport
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('id');
    expect(data.data.type).toBe('bug');
    expect(data.data.title).toBe(bugReport.title);
    expect(data.data.priority).toBe('high');

    // Store ID for later tests
    global.bugReportId = data.data.id;
  });

  test('3. devrait créer une feature request', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    const featureRequest = {
      type: 'feature',
      title: 'Ajouter mode sombre',
      description: 'Implémenter un thème sombre pour l\'interface admin',
      priority: 'medium'
    };

    const response = await request.post(`${BASE_URL}/api/admin/development-requests`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: featureRequest
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('id');
    expect(data.data.type).toBe('feature');
    expect(data.data.title).toBe(featureRequest.title);
    expect(data.data.priority).toBe('medium');
    expect(data.data.status).toBe('pending');

    // Store ID for later tests
    global.featureRequestId = data.data.id;
  });

  test('6. devrait modifier une demande développement', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    // First create a request to modify
    const createResponse = await request.post(`${BASE_URL}/api/admin/development-requests`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'bug',
        title: 'Bug test modification',
        description: 'Description initiale pour modification.',
        priority: 'low'
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const createdData = await createResponse.json();
    const requestId = createdData.data.id;

    // Now update it
    const updateResponse = await request.put(`${BASE_URL}/api/admin/development-requests/${requestId}`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Bug test modification - UPDATED',
        description: 'Description mise à jour',
        priority: 'critical'
      }
    });

    expect(updateResponse.ok()).toBeTruthy();
    const data = await updateResponse.json();
    expect(data).toHaveProperty('success', true);
    expect(data.data.title).toBe('Bug test modification - UPDATED');
    expect(data.data.priority).toBe('critical');
  });

  test('8. devrait changer le statut d\'une demande', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    // Create a request first
    const createResponse = await request.post(`${BASE_URL}/api/admin/development-requests`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'feature',
        title: 'Feature test status change',
        description: 'Test changing status end-to-end.',
        priority: 'medium'
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const createdData = await createResponse.json();
    const requestId = createdData.data.id;

    // Update status to in_progress
    const updateResponse = await request.patch(`${BASE_URL}/api/admin/development-requests/${requestId}/status`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: {
        status: 'in_progress'
      }
    });

    expect(updateResponse.ok()).toBeTruthy();
    const data = await updateResponse.json();
    expect(data).toHaveProperty('success', true);
    expect(data.data.status).toBe('in_progress');

    // Update status to done
    const doneResponse = await request.patch(`${BASE_URL}/api/admin/development-requests/${requestId}/status`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: {
        status: 'done'
      }
    });

    expect(doneResponse.ok()).toBeTruthy();
    const doneData = await doneResponse.json();
    expect(doneData.data.status).toBe('done');
  });

  test('9. devrait supprimer une demande développement', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    // Create a request to delete
    const createResponse = await request.post(`${BASE_URL}/api/admin/development-requests`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'bug',
        title: 'Bug to be deleted',
        description: 'This will be deleted after creation.',
        priority: 'low'
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const createdData = await createResponse.json();
    const requestId = createdData.data.id;

    // Delete it
    const deleteResponse = await request.delete(`${BASE_URL}/api/admin/development-requests/${requestId}`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`
      }
    });

    expect(deleteResponse.ok()).toBeTruthy();
    const data = await deleteResponse.json();
    expect(data).toHaveProperty('success', true);
  });
});

test.describe('Admin: Development Requests - Filtering', () => {

  test('4. devrait filtrer par type (bug/feature)', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    // Filter by bug type
    const bugResponse = await request.get(`${BASE_URL}/api/admin/development-requests?type=bug`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`
      }
    });

    expect(bugResponse.ok()).toBeTruthy();
    const bugData = await bugResponse.json();
    expect(bugData).toHaveProperty('success', true);
    expect(Array.isArray(bugData.data)).toBeTruthy();

    // Verify all items are bugs
    if (bugData.data.length > 0) {
      bugData.data.forEach((item: any) => {
        expect(item.type).toBe('bug');
      });
    }

    // Filter by feature type
    const featureResponse = await request.get(`${BASE_URL}/api/admin/development-requests?type=feature`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`
      }
    });

    expect(featureResponse.ok()).toBeTruthy();
    const featureData = await featureResponse.json();
    expect(featureData).toHaveProperty('success', true);
    expect(Array.isArray(featureData.data)).toBeTruthy();

    // Verify all items are features
    if (featureData.data.length > 0) {
      featureData.data.forEach((item: any) => {
        expect(item.type).toBe('feature');
      });
    }
  });

  test('5. devrait filtrer par statut', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    // Test filtering by each status
    const statuses = ['pending', 'in_progress', 'done', 'cancelled'];

    for (const status of statuses) {
      const response = await request.get(`${BASE_URL}/api/admin/development-requests?status=${status}`, {
        headers: {
          'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(Array.isArray(data.data)).toBeTruthy();

      // Verify all items have the correct status
      if (data.data.length > 0) {
        data.data.forEach((item: any) => {
          expect(item.status).toBe(status);
        });
      }
    }
  });
});

test.describe('Admin: Development Requests - GitHub Sync', () => {

  test('7. devrait synchroniser une demande avec GitHub', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    // Create a request to sync
    const createResponse = await request.post(`${BASE_URL}/api/admin/development-requests`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'bug',
        title: 'Bug to sync with GitHub',
        description: 'This bug should be synced to GitHub',
        priority: 'high'
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const createdData = await createResponse.json();
    const requestId = createdData.data.id;

    // Sync with GitHub
    const syncResponse = await request.post(`${BASE_URL}/api/admin/development-requests/${requestId}/sync`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      }
    });

    // The sync endpoint might return 200 or 201
    expect(syncResponse.ok()).toBeTruthy();

    const data = await syncResponse.json();
    expect(data).toHaveProperty('success', true);

    // If GitHub issue link is included
    if (data.data && data.data.githubIssueUrl) {
      expect(data.data.githubIssueUrl).toContain('github.com');
    }
  });
});

test.describe('Admin: Development Requests - UI Integration', () => {

  test('devrait afficher et interagir avec la page UI', async ({ page }) => {
    await loginAsAdminQuick(page);
    await navigateToDevRequests(page);

    // Attendre le chargement complet
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Chercher un bouton "Créer" ou "Ajouter"
    const createButton = page.locator('button:has-text("Créer"), button:has-text("Ajouter"), button:has-text("Nouveau")').first();

    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click();

      // Attendre l'ouverture du formulaire
      await page.waitForTimeout(500);

      // Vérifier présence des champs du formulaire
      const typeField = page.locator('select, input[name*="type"]').first();
      const titleField = page.locator('input[name*="title"], input[type="text"]').first();
      const descField = page.locator('textarea, input[name*="description"]').first();

      // Au moins un champ devrait être visible
      const hasTypeField = await typeField.isVisible({ timeout: 2000 }).catch(() => false);
      const hasTitleField = await titleField.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasTypeField || hasTitleField).toBeTruthy();
    }
  });

  test('devrait afficher la liste des demandes', async ({ page }) => {
    await loginAsAdminQuick(page);
    await navigateToDevRequests(page);

    // Attendre le chargement
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Chercher les éléments de liste
    const listItems = page.locator('tr, [class*="item"], [class*="row"]');
    const count = await listItems.count();

    // Au moins un élément devrait être visible (ou message "aucune demande")
    const hasContent = count > 0 || await page.locator('text=/aucune|no|empty/i').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasContent).toBeTruthy();
  });
});

test.describe('Admin: Development Requests - Priority Levels', () => {

  test('devrait créer des demandes avec différentes priorités', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    const priorities = ['low', 'medium', 'high', 'critical'];

    for (const priority of priorities) {
      const response = await request.post(`${BASE_URL}/api/admin/development-requests`, {
        headers: {
          'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
          'Content-Type': 'application/json'
        },
        data: {
          type: 'bug',
          title: `Bug with ${priority} priority`,
          description: `Test priority: ${priority} for validation.`,
          priority: priority
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.data.priority).toBe(priority);
    }
  });
});

test.describe('Admin: Development Requests - Status Workflow', () => {

  test('devrait supporter le workflow complet des statuts', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    // Create initial request (status: pending)
    const createResponse = await request.post(`${BASE_URL}/api/admin/development-requests`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'feature',
        title: 'Feature workflow test',
        description: 'Test status workflow complet.',
        priority: 'medium'
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const createdData = await createResponse.json();
    const requestId = createdData.data.id;
    expect(createdData.data.status).toBe('pending');

    // Workflow: pending -> in_progress -> done
    const statuses = ['pending', 'in_progress', 'done'];

    for (let i = 1; i < statuses.length; i++) {
      const targetStatus = statuses[i];

      const updateResponse = await request.patch(`${BASE_URL}/api/admin/development-requests/${requestId}/status`, {
        headers: {
          'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
          'Content-Type': 'application/json'
        },
        data: {
          status: targetStatus
        }
      });

      expect(updateResponse.ok()).toBeTruthy();
      const data = await updateResponse.json();
      expect(data.data.status).toBe(targetStatus);
    }
  });

  test('devrait permettre l\'annulation d\'une demande', async ({ request, page }) => {
    await loginAsAdminQuick(page);

    const cookies = await page.context().cookies();
    const sessionCookie = getSessionCookie(cookies);

    expect(sessionCookie).toBeDefined();

    // Create a request
    const createResponse = await request.post(`${BASE_URL}/api/admin/development-requests`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: 'bug',
        title: 'Bug to cancel',
        description: 'This will be cancelled after update.',
        priority: 'low'
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const createdData = await createResponse.json();
    const requestId = createdData.data.id;

    // Cancel it
    const cancelResponse = await request.patch(`${BASE_URL}/api/admin/development-requests/${requestId}/status`, {
      headers: {
        'Cookie': `${sessionCookie!.name}=${sessionCookie!.value}`,
        'Content-Type': 'application/json'
      },
      data: {
        status: 'cancelled'
      }
    });

    expect(cancelResponse.ok()).toBeTruthy();
    const data = await cancelResponse.json();
    expect(data.data.status).toBe('cancelled');
  });
});
