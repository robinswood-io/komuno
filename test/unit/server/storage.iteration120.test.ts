import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 120', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialComparison uses absolute value when period1 balance is negative', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 100, createdAt: '2050-01-01T00:00:00.000Z' },
              { amountInCents: 900, createdAt: '2051-01-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 300, expenseDate: '2050-05-01' },
              { amountInCents: 200, expenseDate: '2051-05-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2050 }, { period: 'year', year: 2051 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance.period1).toBe(-200);
      expect(result.data.balance.period2).toBe(700);
      expect(result.data.balance.changePercent).toBe(450);
    }
  });
});
