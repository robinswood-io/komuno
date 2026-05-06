import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 114', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialKPIsExtended aggregates budgeted expenses for currentYear fallback', async () => {
    const currentYear = new Date().getFullYear();

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, []],
          [schema.financialExpenses, []],
          [
            schema.financialBudgets,
            [
              { year: currentYear, amountInCents: 1200 },
              { year: currentYear, amountInCents: 800 },
              { year: currentYear - 1, amountInCents: 9999 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', undefined);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.budgeted).toBe(2000);
    }
  });
});
