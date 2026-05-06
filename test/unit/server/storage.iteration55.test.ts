import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 55', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialComparison computes absolute-based balance percentage from negative baseline', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 100, createdAt: '2027-01-01T00:00:00.000Z' },
              { amountInCents: 1000, createdAt: '2028-01-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 400, expenseDate: '2027-01-01' },
              { amountInCents: 200, expenseDate: '2028-01-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2027 }, { period: 'year', year: 2028 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance.period1).toBe(-300);
      expect(result.data.balance.period2).toBe(800);
      expect(result.data.balance.changePercent).toBeCloseTo(366.67, 2);
    }
  });
});
