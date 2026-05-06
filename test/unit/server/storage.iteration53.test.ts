import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 53', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialKPIsExtended keeps currentYear budget filter behavior when year is provided', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 700, createdAt: '2028-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, [{ year: 2028, forecastedAmountInCents: 700 }]],
          [schema.financialExpenses, [{ amountInCents: 100, expenseDate: '2028-04-01' }]],
          [
            schema.financialBudgets,
            [
              { year: 2028, amountInCents: 200 },
              { year: 2027, amountInCents: 999 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.budgeted).toBe(200);
      expect(result.data.expenses.variance).toBe(-100);
    }
  });
});
