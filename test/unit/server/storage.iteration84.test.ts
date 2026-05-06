import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 84', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getBudgetById returns matching budget when present', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.financialBudgets,
            [
              { id: 'budget-84-a', amountInCents: 10 },
              { id: 'budget-84-target', amountInCents: 20 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getBudgetById('budget-84-target');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.id).toBe('budget-84-target');
      expect(result.data?.amountInCents).toBe(20);
    }
  });
});
