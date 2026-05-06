import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 79', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes getFinancialKPIsExtended budget selection path with non-empty budgets', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 600, createdAt: '2030-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, [{ year: 2030, forecastedAmountInCents: 600 }]],
          [schema.financialExpenses, [{ amountInCents: 200, expenseDate: '2030-05-01' }]],
          [
            schema.financialBudgets,
            [
              { year: 2030, amountInCents: 100 },
              { year: 2030, amountInCents: 200 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2030);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.budgeted).toBe(300);
    }
  });
});
