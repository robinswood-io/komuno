import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 117', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialComparison keeps revenue change percent at 0 when period1 revenue is zero', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 900, createdAt: '2045-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 100, expenseDate: '2044-06-01' },
              { amountInCents: 300, expenseDate: '2045-06-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2044 }, { period: 'year', year: 2045 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.changePercent).toBe(0);
      expect(result.data.revenues.period1).toBe(0);
      expect(result.data.revenues.period2).toBe(900);
    }
  });
});
