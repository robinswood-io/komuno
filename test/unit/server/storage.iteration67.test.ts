import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 67', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts returns DatabaseError on synchronous select failure', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('generate-select-sync-failed');
    });

    const storage = createStorage();
    const result = await storage.generateForecasts('year', 2035);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors de la génération des prévisions');
    }
  });
});
