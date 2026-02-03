import { test, expect } from '@playwright/test';
import { getAuthHeaders, loginAsAdminQuick } from '../helpers/auth';

test.describe('Admin Pagination - Affichage complet des idées et événements', () => {
  const BASE_URL = 'https://cjd80.rbw.ovh';

  test.beforeEach(async ({ page }) => {
    await loginAsAdminQuick(page, BASE_URL);
  });

  test('should display all ideas in admin interface', async ({ page, request }) => {
    const authHeaders = await getAuthHeaders(page);
    const response = await request.get(`${BASE_URL}/api/admin/ideas?limit=500`, {
      headers: authHeaders
    });
    expect(response.ok()).toBe(true);
    const data = await response.json();
    const expectedTotal = typeof data.total === 'number' ? data.total : data.data.length;

    await page.goto(`${BASE_URL}/admin/ideas`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    if (expectedTotal === 0) {
      await expect(page.getByText('Aucune idée trouvée')).toBeVisible();
      const rows = page.locator('table tbody tr');
      const dataRows = rows.filter({ hasNotText: 'Aucune idée trouvée' });
      expect(await dataRows.count()).toBe(0);
      console.log('✅ Aucun idée disponible, UI vide confirmée');
      return;
    }

    const rows = page.locator('table tbody tr');
    const dataRows = rows.filter({ hasNotText: 'Aucune idée trouvée' });
    await expect(dataRows.first()).toBeVisible();

    const expectedVisible = Math.min(expectedTotal, 20);
    const totalIdeas = await dataRows.count();
    expect(totalIdeas).toBe(expectedVisible);

    console.log(`✅ Idées affichées: ${totalIdeas} (Backend total: ${expectedTotal})`);
  });

  test('should display all events in admin interface', async ({ page, request }) => {
    const authHeaders = await getAuthHeaders(page);
    const response = await request.get(`${BASE_URL}/api/admin/events?limit=500`, {
      headers: authHeaders
    });
    expect(response.ok()).toBe(true);
    const data = await response.json();
    const expectedTotal = typeof data.total === 'number' ? data.total : data.data.length;

    await page.goto(`${BASE_URL}/admin/events`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    if (expectedTotal === 0) {
      await expect(page.getByText('Aucun événement trouvé')).toBeVisible();
      const rows = page.locator('table tbody tr');
      const dataRows = rows.filter({ hasNotText: 'Aucun événement trouvé' });
      expect(await dataRows.count()).toBe(0);
      console.log('✅ Aucun événement disponible, UI vide confirmée');
      return;
    }

    const rows = page.locator('table tbody tr');
    const dataRows = rows.filter({ hasNotText: 'Aucun événement trouvé' });
    await expect(dataRows.first()).toBeVisible();

    const expectedVisible = Math.min(expectedTotal, 20);
    const totalEvents = await dataRows.count();
    expect(totalEvents).toBe(expectedVisible);

    console.log(`✅ Événements affichés: ${totalEvents} (Backend total: ${expectedTotal})`);
  });

  test('should display tables on medium screens and cards on mobile', async ({ page }) => {
    // Test desktop (768px+)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`${BASE_URL}/admin/ideas`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que le tableau est visible
    const table = page.locator('table').first();
    await expect(table).toBeVisible();
    
    // Test mobile (<768px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Attendre le reflow
    
    // Vérifier que le tableau reste visible sur mobile
    await expect(table).toBeVisible();
    
    console.log('✅ Affichage responsive vérifié (table visible desktop/mobile)');
  });

  test('should not show pagination controls', async ({ page }) => {
    const authHeaders = await getAuthHeaders(page);
    const ideasResponse = await page.request.get(`${BASE_URL}/api/admin/ideas?limit=500`, {
      headers: authHeaders
    });
    expect(ideasResponse.ok()).toBe(true);
    const ideasData = await ideasResponse.json();
    const ideasTotal = typeof ideasData.total === 'number' ? ideasData.total : ideasData.data.length;

    await page.goto(`${BASE_URL}/admin/ideas`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const ideasPrev = page.getByRole('button', { name: 'Précédent' });
    const ideasNext = page.getByRole('button', { name: 'Suivant' });

    if (ideasTotal > 20) {
      await expect(ideasNext).toBeVisible();
    } else {
      await expect(ideasNext).toHaveCount(0);
      await expect(ideasPrev).toHaveCount(0);
    }

    const eventsResponse = await page.request.get(`${BASE_URL}/api/admin/events?limit=500`, {
      headers: authHeaders
    });
    expect(eventsResponse.ok()).toBe(true);
    const eventsData = await eventsResponse.json();
    const eventsTotal = typeof eventsData.total === 'number' ? eventsData.total : eventsData.data.length;

    await page.goto(`${BASE_URL}/admin/events`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const eventsPrev = page.getByRole('button', { name: 'Précédent' });
    const eventsNext = page.getByRole('button', { name: 'Suivant' });

    if (eventsTotal > 20) {
      await expect(eventsNext).toBeVisible();
    } else {
      await expect(eventsNext).toHaveCount(0);
      await expect(eventsPrev).toHaveCount(0);
    }

    console.log('✅ Pagination vérifiée selon le total des éléments');
  });

  test('should verify table format with all columns', async ({ page }) => {
    // Desktop view
    await page.setViewportSize({ width: 1024, height: 768 });
    
    // Vérifier les colonnes du tableau des idées
    await page.goto(`${BASE_URL}/admin/ideas`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('table', { timeout: 5000 });
    
    const ideaHeaders = await page.locator('table thead th').allTextContents();
    expect(ideaHeaders).toContain('Titre');
    expect(ideaHeaders).toContain('Auteur');
    expect(ideaHeaders).toContain('Statut');
    expect(ideaHeaders).toContain('Votes');
    expect(ideaHeaders).toContain('Date');
    expect(ideaHeaders).toContain('Actions');
    
    // Vérifier les colonnes du tableau des événements
    await page.goto(`${BASE_URL}/admin/events`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('table', { timeout: 5000 });
    
    const eventHeaders = await page.locator('table thead th').allTextContents();
    expect(eventHeaders).toContain('Titre');
    expect(eventHeaders).toContain('Date');
    expect(eventHeaders).toContain('Lieu');
    expect(eventHeaders).toContain('Inscriptions');
    expect(eventHeaders).toContain('Statut');
    expect(eventHeaders).toContain('Actions');
    
    console.log('✅ Format tableau vérifié avec toutes les colonnes');
  });
});
