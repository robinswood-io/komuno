import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 76', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('covers getFinancialComparison catch branch with synchronous select throw', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('comparison-sync-error');
    });

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2020 }, { period: 'year', year: 2021 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors de la comparaison financière');
    }
  });
});
