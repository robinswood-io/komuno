import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 62', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialKPIsExtended year filter keeps only matching expense and budget rows', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 1200, createdAt: '2029-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 300, status: 'completed', createdAt: '2029-02-01T00:00:00.000Z' }]],
          [schema.financialForecasts, [{ year: 2029, forecastedAmountInCents: 1000 }]],
          [
            schema.financialExpenses,
            [
              { amountInCents: 250, expenseDate: '2029-03-01' },
              { amountInCents: 800, expenseDate: '2028-03-01' },
            ],
          ],
          [
            schema.financialBudgets,
            [
              { year: 2029, amountInCents: 500 },
              { year: 2028, amountInCents: 999 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2029);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.actual).toBe(250);
      expect(result.data.expenses.budgeted).toBe(500);
    }
  });
});
