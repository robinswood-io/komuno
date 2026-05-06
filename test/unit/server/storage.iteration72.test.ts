import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 72', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes getFinancialComparison main path with two populated years', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1000, createdAt: '2020-01-01T00:00:00.000Z' },
              { amountInCents: 1500, createdAt: '2021-01-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 300, status: 'completed', createdAt: '2021-02-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 400, expenseDate: '2020-03-01' },
              { amountInCents: 600, expenseDate: '2021-03-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2020 }, { period: 'year', year: 2021 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.period1).toBe(1000);
      expect(result.data.revenues.period2).toBe(1800);
      expect(result.data.expenses.period1).toBe(400);
      expect(result.data.expenses.period2).toBe(600);
    }
  });
});
