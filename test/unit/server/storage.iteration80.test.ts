import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 80', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('keeps getFinancialKPIsExtended budgetedExpenses at zero when budgets list is empty', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 300, createdAt: '2031-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 100, status: 'completed', createdAt: '2031-02-01T00:00:00.000Z' }]],
          [schema.financialForecasts, [{ year: 2031, forecastedAmountInCents: 500 }]],
          [schema.financialExpenses, [{ amountInCents: 150, expenseDate: '2031-06-01' }]],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2031);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.budgeted).toBe(0);
    }
  });
});
