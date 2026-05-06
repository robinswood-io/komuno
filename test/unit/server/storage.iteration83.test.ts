import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema } from './storage.test-helpers';

describe('server/storage.js iteration 83', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createBudget wraps insert failure into DatabaseError', async () => {
    mockDb.insert.mockReturnValue({
      values: (_payload: unknown) => ({
        returning: async () => {
          throw new Error('budget insert failed');
        },
      }),
    });

    const storage = createStorage();
    const result = await storage.createBudget({
      period: 'year',
      year: 2033,
      category: 'marketing',
      amountInCents: 5000,
      createdBy: 'admin-83',
    });

    expect(mockDb.insert).toHaveBeenCalledWith(schema.financialBudgets);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('création du budget');
    }
  });
});
