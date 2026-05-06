import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 64', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialKPIsExtended handles no matching budget year and keeps percent guard at zero', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 900, createdAt: '2031-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 100, status: 'confirmed', createdAt: '2031-02-01T00:00:00.000Z' }]],
          [schema.financialForecasts, [{ year: 2031, forecastedAmountInCents: 1000 }]],
          [schema.financialExpenses, [{ amountInCents: 200, expenseDate: '2031-03-01' }]],
          [schema.financialBudgets, [{ year: 2030, amountInCents: 300 }]],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2031);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.budgeted).toBe(0);
      expect(result.data.expenses.variancePercent).toBe(0);
    }
  });
});
