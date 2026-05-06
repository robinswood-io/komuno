import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 138', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes expenses yearly filter callback with Date parsing (line 4000/4001)', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 300, expenseDate: '2056-05-01' },
              { amountInCents: 1200, expenseDate: '2054-05-01' },
            ],
          ],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2056);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.actual).toBe(300);
    }
  });
});
