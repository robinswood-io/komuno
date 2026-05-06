import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema } from './storage.test-helpers';

describe('server/storage.js iteration 88', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createExpense returns inserted expense on success', async () => {
    mockDb.insert.mockReturnValue({
      values: (payload: Record<string, unknown>) => ({
        returning: async () => [{ id: 'expense-88', ...payload }],
      }),
    });

    const storage = createStorage();
    const result = await storage.createExpense({
      category: 'ops',
      amountInCents: 8888,
      expenseDate: '2034-05-10',
      createdBy: 'admin-88',
    });

    expect(mockDb.insert).toHaveBeenCalledWith(schema.financialExpenses);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('expense-88');
      expect(result.data.amountInCents).toBe(8888);
    }
  });
});
