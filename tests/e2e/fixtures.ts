import { test as base, expect } from '@playwright/test';
import { cleanupTestData } from './helpers/cleanup';

/**
 * Custom test fixture avec nettoyage automatique après chaque test
 * + Gestion robuste des cookies de session
 *
 * Utilisation:
 * ```typescript
 * import { test, expect } from '../fixtures';
 *
 * test.describe('My tests', () => {
 *   test('should create and cleanup test data', async ({ page }) => {
 *     // Vos tests ici - les données seront automatiquement nettoyées après
 *   });
 * });
 * ```
 */

// Étendre le test de base avec un hook afterEach automatique
const test = base.extend<{ autoCleanup: void }>({
  // Cette fixture s'exécute automatiquement pour chaque test
  autoCleanup: [async ({}, use) => {
    // Avant le test (setup) - rien à faire ici
    await use();

    // Après le test (teardown) - nettoyer les données
    try {
      await cleanupTestData();
    } catch (error) {
      console.error('[Test Cleanup] Erreur lors du nettoyage automatique:', error);
      // On ne fait pas échouer le test si le nettoyage échoue
    }
  }, { auto: true }] // auto: true force l'exécution pour chaque test
});

export { test, expect };
