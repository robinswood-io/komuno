import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 116', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialComparison computes period deltas for two populated years', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1000, createdAt: '2042-01-01T00:00:00.000Z' },
              { amountInCents: 1600, createdAt: '2043-01-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 200, status: 'completed', createdAt: '2042-02-01T00:00:00.000Z' },
              { amount: 300, status: 'completed', createdAt: '2043-02-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 400, expenseDate: '2042-04-01' },
              { amountInCents: 500, expenseDate: '2043-04-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2042 }, { period: 'year', year: 2043 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.period1).toBe(1200);
      expect(result.data.revenues.period2).toBe(1900);
      expect(result.data.expenses.period1).toBe(400);
      expect(result.data.expenses.period2).toBe(500);
    }
  });
});
