import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 131', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes getFinancialComparison with negative baseline balance to keep absolute-percent path', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 200, createdAt: '2064-01-01T00:00:00.000Z' },
              { amountInCents: 600, createdAt: '2065-01-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 500, expenseDate: '2064-06-01' },
              { amountInCents: 100, expenseDate: '2065-06-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2064 }, { period: 'year', year: 2065 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance.period1).toBe(-300);
      expect(result.data.balance.period2).toBe(500);
      expect(result.data.balance.changePercent).toBeCloseTo(266.67, 2);
    }
  });
});
