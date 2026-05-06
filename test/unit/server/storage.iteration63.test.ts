import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 63', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialKPIsExtended handles empty filtered expenses set for provided year', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 500, createdAt: '2030-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, [{ year: 2030, forecastedAmountInCents: 500 }]],
          [schema.financialExpenses, [{ amountInCents: 300, expenseDate: '2029-06-01' }]],
          [schema.financialBudgets, [{ year: 2030, amountInCents: 100 }]],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2030);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.actual).toBe(0);
      expect(result.data.expenses.variance).toBe(-100);
    }
  });
});
