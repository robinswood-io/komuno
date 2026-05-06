import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 65', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialComparison mixes zero revenue baseline with non-zero expense baseline', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 700, createdAt: '2032-01-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 400, expenseDate: '2031-01-01' },
              { amountInCents: 100, expenseDate: '2032-01-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2031 }, { period: 'year', year: 2032 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.changePercent).toBe(0);
      expect(result.data.expenses.changePercent).toBe(-75);
    }
  });
});
