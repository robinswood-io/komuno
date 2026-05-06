import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 66', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialComparison keeps balance change percent at 0 when baseline balance equals 0', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 500, createdAt: '2033-01-01T00:00:00.000Z' },
              { amountInCents: 900, createdAt: '2034-01-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 500, expenseDate: '2033-01-01' },
              { amountInCents: 300, expenseDate: '2034-01-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2033 }, { period: 'year', year: 2034 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance.period1).toBe(0);
      expect(result.data.balance.changePercent).toBe(0);
    }
  });
});
