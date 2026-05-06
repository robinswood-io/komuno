import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 130', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes getFinancialComparison catch path when select throws immediately', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('comparison hard fail');
    });

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2062 }, { period: 'year', year: 2063 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('comparaison financière');
    }
  });
});
