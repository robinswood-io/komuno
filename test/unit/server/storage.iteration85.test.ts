import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 85', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateBudget returns NotFoundError when budget does not exist in pre-check', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map<unknown, unknown[]>([[schema.financialBudgets, [{ id: 'other-budget' }]]])),
    );

    const storage = createStorage();
    const result = await storage.updateBudget('budget-missing-85', { amountInCents: 999 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Budget non trouvé');
    }
  });
});
