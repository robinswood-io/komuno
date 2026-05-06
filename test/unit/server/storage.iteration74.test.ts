import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 74', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('covers getFinancialComparison expense baseline guard at zero', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 700, createdAt: '2023-01-01T00:00:00.000Z' },
              { amountInCents: 900, createdAt: '2024-01-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [schema.financialExpenses, [{ amountInCents: 100, expenseDate: '2024-02-01' }]],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2023 }, { period: 'year', year: 2024 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.period1).toBe(0);
      expect(result.data.expenses.changePercent).toBe(0);
    }
  });
});
