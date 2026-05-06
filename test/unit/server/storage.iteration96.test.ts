import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 96', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getBudgetStats filters by period only and aggregates counts/amounts', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.financialBudgets,
            [
              { period: 'month', year: 2036, category: 'ops', amountInCents: 100 },
              { period: 'month', year: 2037, category: 'ops', amountInCents: 200 },
              { period: 'quarter', year: 2037, category: 'sales', amountInCents: 999 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getBudgetStats('month', undefined);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalBudgets).toBe(2);
      expect(result.data.totalAmount).toBe(300);
      expect(result.data.byCategory).toEqual(
        expect.arrayContaining([{ category: 'ops', count: 2, totalAmount: 300 }]),
      );
    }
  });
});
