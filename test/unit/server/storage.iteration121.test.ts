import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 121', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialComparison returns DatabaseError when first select throws', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('comparison select failed');
    });

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2052 }, { period: 'year', year: 2053 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('comparaison financière');
    }
  });
});
