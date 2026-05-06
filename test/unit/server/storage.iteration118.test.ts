import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 118', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialComparison keeps expense change percent at 0 when period1 expenses are zero', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 200, createdAt: '2046-01-01T00:00:00.000Z' },
              { amountInCents: 400, createdAt: '2047-01-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [schema.financialExpenses, [{ amountInCents: 150, expenseDate: '2047-02-01' }]],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2046 }, { period: 'year', year: 2047 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.period1).toBe(0);
      expect(result.data.expenses.period2).toBe(150);
      expect(result.data.expenses.changePercent).toBe(0);
    }
  });
});
