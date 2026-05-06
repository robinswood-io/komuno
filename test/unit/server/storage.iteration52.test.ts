import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 52', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialKPIsExtended hits expense and budget yearly reductions with non-empty sets', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 1000, createdAt: '2028-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 500, status: 'completed', createdAt: '2028-02-01T00:00:00.000Z' }]],
          [schema.financialForecasts, [{ year: 2028, forecastedAmountInCents: 1200 }]],
          [schema.financialExpenses, [{ amountInCents: 300, expenseDate: '2028-03-01' }]],
          [schema.financialBudgets, [{ year: 2028, amountInCents: 400 }]],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.actual).toBe(300);
      expect(result.data.expenses.budgeted).toBe(400);
      expect(result.data.revenues.actual).toBe(1500);
    }
  });
});
