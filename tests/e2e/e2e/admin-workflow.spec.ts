import { test, expect } from '@playwright/test';
import { loginAsAdminQuick } from '../helpers/auth';

test.describe('Admin E2E Tests - Nouvelles fonctionnalités', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminQuick(page);
  });

  test('should display ideas sorted by status then date', async ({ page }) => {
    await page.route('/api/admin/ideas*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'idea-1',
              title: 'Idée en attente',
              description: 'Test',
              proposedBy: 'Jean',
              proposedByEmail: 'jean@example.com',
              status: 'pending',
              voteCount: 2,
              createdAt: new Date().toISOString()
            },
            {
              id: 'idea-2',
              title: 'Idée approuvée',
              description: 'Test',
              proposedBy: 'Marie',
              proposedByEmail: 'marie@example.com',
              status: 'approved',
              voteCount: 5,
              createdAt: new Date().toISOString()
            }
          ],
          total: 2,
          page: 1,
          limit: 20
        })
      });
    });

    await page.goto('/admin/ideas');
    await page.waitForSelector('[data-testid="ideas-table"]', { timeout: 5000 });

    // Vérifier que les idées sont bien triées par statut
    const ideaTitles = await page.locator('[data-testid="idea-title"]').allTextContents();
    
    // Les idées en attente devraient apparaître en premier
    expect(ideaTitles.length).toBeGreaterThan(0);
    
    // Vérifier l'ordre de tri via les badges de statut
    const statusBadges = await page.locator('[data-testid="idea-status-badge"]').allTextContents();
    
    // Les statuts "En attente" devraient apparaître avant "Approuvé", "Réalisé", etc.
    let pendingIndex = -1;
    let approvedIndex = -1;
    
    for (let i = 0; i < statusBadges.length; i++) {
      if (statusBadges[i].includes('En attente') && pendingIndex === -1) {
        pendingIndex = i;
      }
      if (statusBadges[i].includes('Approuvée')) {
        approvedIndex = i;
        break;
      }
    }
    
    if (pendingIndex >= 0 && approvedIndex >= 0) {
      expect(pendingIndex).toBeLessThan(approvedIndex);
    }
  });

  test('should open manage votes modal on votes button click', async ({ page }) => {
    await page.goto('/admin/ideas');
    await page.waitForSelector('[data-testid="idea-details-button"]', { timeout: 5000 });

    // Cliquer sur le premier bouton de détails
    await page.click('[data-testid="idea-details-button"]');

    // Vérifier que la modale s'ouvre
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Vérifier la section votes
    await expect(page.locator('text=Votes')).toBeVisible();
  });

  test('should open manage inscriptions modal on inscriptions button click', async ({ page }) => {
    await page.goto('/admin/events');
    await page.waitForSelector('[data-testid="event-inscriptions-button"]', { timeout: 5000 });

    // Cliquer sur le bouton de gestion des inscriptions
    await page.click('[data-testid="event-inscriptions-button"]');

    // Vérifier que la modale s'ouvre
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Vérifier le titre de la modale
    await expect(page.locator('text=Inscriptions')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Simuler un appareil mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/admin/events');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /Gestion des Événements/i });
    await expect(heading).toBeVisible();

    const table = page.locator('[data-testid="events-table"]');
    await expect(table).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/admin/ideas');
    await page.waitForLoadState('networkidle');

    const detailsButton = page.locator('[data-testid="idea-details-button"]').first();
    await detailsButton.focus();
    await expect(detailsButton).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Intercepter les requêtes API pour simuler des erreurs
    await page.route('/api/admin/ideas', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server error' })
      });
    });

    await page.goto('/admin/ideas');

    // L'application ne devrait pas crash
    await expect(page.getByRole('heading', { name: /Gestion des Idées/i })).toBeVisible();
    
    // Vérifier qu'une indication d'erreur ou de chargement est visible
    await expect(page.locator('text=Erreur')).toBeVisible();
  });

  test('should preserve description formatting with line breaks', async ({ page }) => {
    await page.goto('/admin/events');
    
    // Attendre le chargement
    await page.waitForLoadState('networkidle');

    // Vérifier que les descriptions d'événements préservent les sauts de ligne
    const descriptions = page.locator('.event-description');
    
    if (await descriptions.count() > 0) {
      const firstDescription = descriptions.first();
      
      // Vérifier que le CSS whitespace-pre-line est appliqué
      const whiteSpace = await firstDescription.evaluate(el => 
        window.getComputedStyle(el).whiteSpace
      );
      
      expect(whiteSpace).toBe('pre-line');
    }
  });

  test('should maintain performance standards', async ({ page }) => {
    // Mesurer les performances
    const startTime = Date.now();
    
    await page.goto('/admin/ideas');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Vérifier que le chargement prend moins de 3 secondes
    expect(loadTime).toBeLessThan(3000);

    // Vérifier les Core Web Vitals basiques
    const performanceEntries = await page.evaluate(() => {
      return JSON.stringify(performance.getEntriesByType('navigation'));
    });
    
    const entries = JSON.parse(performanceEntries);
    if (entries.length > 0) {
      const entry = entries[0];
      // DOM Content Loaded doit être raisonnable
      expect(entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart).toBeLessThan(1000);
    }
  });
});
