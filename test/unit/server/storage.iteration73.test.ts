import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 73', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('covers getFinancialComparison revenue baseline guard at zero', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 900, createdAt: '2022-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, []],
          [schema.financialExpenses, [{ amountInCents: 300, expenseDate: '2022-01-01' }]],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2021 }, { period: 'year', year: 2022 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.period1).toBe(0);
      expect(result.data.revenues.changePercent).toBe(0);
    }
  });
});
