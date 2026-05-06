import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 112', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialKPIsExtended filters sponsorships/expenses/budgets by provided year with mixed rows', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1000, createdAt: '2040-01-10T00:00:00.000Z' },
              { amountInCents: 9999, createdAt: '2039-01-10T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 500, status: 'completed', createdAt: '2040-02-01T00:00:00.000Z' },
              { amount: 700, status: 'confirmed', createdAt: '2039-02-01T00:00:00.000Z' },
            ],
          ],
          [schema.financialForecasts, [{ year: 2040, forecastedAmountInCents: 1200 }]],
          [
            schema.financialExpenses,
            [
              { amountInCents: 200, expenseDate: '2040-03-01' },
              { amountInCents: 300, expenseDate: '2039-03-01' },
            ],
          ],
          [
            schema.financialBudgets,
            [
              { year: 2040, amountInCents: 400 },
              { year: 2039, amountInCents: 900 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2040);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(1500);
      expect(result.data.expenses.actual).toBe(200);
      expect(result.data.expenses.budgeted).toBe(400);
    }
  });
});
