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
      // Optionnel: Skip cleanup si variable d'environnement définie
      if (process.env.SKIP_E2E_CLEANUP === 'true') {
        console.log('[Test Cleanup] ⏭️  Cleanup ignoré (SKIP_E2E_CLEANUP=true)');
      } else {
        const cleanupPromise = cleanupTestData();
        // Timeout prudent pour éviter que le nettoyage bloque les tests (10s max)
        await Promise.race([
          cleanupPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('[Test Cleanup] Timeout 10s')), 10000)
          )
        ]);
      }
    } catch (error) {
      const errorMsg = String(error).toLowerCase();
      // Ignorer les erreurs de connexion réseau (tests locaux hors Docker)
      if (errorMsg.includes('eai_again') || errorMsg.includes('getaddrinfo') || errorMsg.includes('timeout')) {
        console.log('[Test Cleanup] ⚠️  Nettoyage timeout/inaccessible - ignoré (tests locaux?)');
      } else {
        console.error('[Test Cleanup] Erreur lors du nettoyage automatique:', error);
      }
      // On ne fait pas échouer le test si le nettoyage échoue
    }
  }, { auto: true, timeout: 30000 }] // Timeout de 30s pour la fixture
});

export { test, expect };
