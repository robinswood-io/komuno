import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema } from './storage.test-helpers';

describe('server/storage.js iteration 90', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('deleteExpense returns success when delete query resolves', async () => {
    mockDb.delete.mockReturnValue({
      where: async (_criteria: unknown) => undefined,
    });

    const storage = createStorage();
    const result = await storage.deleteExpense('expense-90');

    expect(mockDb.delete).toHaveBeenCalledWith(schema.financialExpenses);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });
});
