import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 86', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateBudget returns updated budget when select pre-check and update succeed', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map<unknown, unknown[]>([[schema.financialBudgets, [{ id: 'budget-86', amountInCents: 100 }]]])),
    );

    mockDb.update.mockReturnValue({
      set: (payload: Record<string, unknown>) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [{ id: 'budget-86', ...payload }],
        }),
      }),
    });

    const storage = createStorage();
    const result = await storage.updateBudget('budget-86', { amountInCents: 777, notes: 'updated' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('budget-86');
      expect(result.data.amountInCents).toBe(777);
      expect(result.data.notes).toBe('updated');
    }
    expect(mockDb.update).toHaveBeenCalledWith(schema.financialBudgets);
  });
});
