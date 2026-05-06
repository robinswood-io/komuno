import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 99', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateExpense returns NotFoundError when expense pre-check misses id', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map<unknown, unknown[]>([[schema.financialExpenses, [{ id: 'other-exp-99' }]]])),
    );

    const storage = createStorage();
    const result = await storage.updateExpense('exp-99-missing', { amountInCents: 99 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Dépense non trouvée');
    }
  });
});
