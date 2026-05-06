import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema } from './storage.test-helpers';

describe('server/storage.js iteration 82', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createBudget returns inserted budget on success', async () => {
    mockDb.insert.mockReturnValue({
      values: (payload: Record<string, unknown>) => ({
        returning: async () => [{ id: 'budget-82', ...payload }],
      }),
    });

    const storage = createStorage();
    const result = await storage.createBudget({
      period: 'month',
      year: 2032,
      category: 'ops',
      amountInCents: 12345,
      createdBy: 'admin-82',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('budget-82');
      expect(result.data.amountInCents).toBe(12345);
    }
    expect(mockDb.insert).toHaveBeenCalledWith(schema.financialBudgets);
  });
});
