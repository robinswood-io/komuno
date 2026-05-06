import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 54', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialComparison computes deltas with non-zero baselines', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1000, createdAt: '2027-01-01T00:00:00.000Z' },
              { amountInCents: 1400, createdAt: '2028-01-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, [{ amount: 200, status: 'confirmed', createdAt: '2028-02-01T00:00:00.000Z' }]],
          [
            schema.financialExpenses,
            [
              { amountInCents: 500, expenseDate: '2027-03-01' },
              { amountInCents: 600, expenseDate: '2028-03-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2027 }, { period: 'year', year: 2028 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.change).toBe(600);
      expect(result.data.expenses.change).toBe(100);
    }
  });
});
