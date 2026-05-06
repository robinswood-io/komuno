import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 56', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialComparison returns DatabaseError on select failure', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('comparison-select-failed');
    });

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2027 }, { period: 'year', year: 2028 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors de la comparaison financière');
    }
  });
});
