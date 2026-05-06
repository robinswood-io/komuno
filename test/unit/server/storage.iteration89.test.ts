import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 89', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateExpense returns updated expense when pre-check and update succeed', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map<unknown, unknown[]>([[schema.financialExpenses, [{ id: 'expense-89', amountInCents: 10 }]]])),
    );

    mockDb.update.mockReturnValue({
      set: (payload: Record<string, unknown>) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [{ id: 'expense-89', ...payload }],
        }),
      }),
    });

    const storage = createStorage();
    const result = await storage.updateExpense('expense-89', { amountInCents: 555, notes: 'ok' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('expense-89');
      expect(result.data.amountInCents).toBe(555);
      expect(result.data.notes).toBe('ok');
    }
    expect(mockDb.update).toHaveBeenCalledWith(schema.financialExpenses);
  });
});
