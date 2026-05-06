import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 78', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes getFinancialKPIsExtended yearly expense reduction line with non-empty filtered expenses', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 500, createdAt: '2029-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, [{ year: 2029, forecastedAmountInCents: 500 }]],
          [
            schema.financialExpenses,
            [
              { amountInCents: 100, expenseDate: '2029-03-01' },
              { amountInCents: 800, expenseDate: '2028-03-01' },
            ],
          ],
          [schema.financialBudgets, [{ year: 2029, amountInCents: 300 }]],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2029);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.actual).toBe(100);
    }
  });
});
