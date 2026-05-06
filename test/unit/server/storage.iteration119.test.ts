import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 119', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialComparison keeps balance change percent at 0 when period1 balance is zero', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 300, createdAt: '2048-01-01T00:00:00.000Z' },
              { amountInCents: 600, createdAt: '2049-01-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 300, expenseDate: '2048-03-01' },
              { amountInCents: 200, expenseDate: '2049-03-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2048 }, { period: 'year', year: 2049 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance.period1).toBe(0);
      expect(result.data.balance.period2).toBe(400);
      expect(result.data.balance.changePercent).toBe(0);
    }
  });
});
