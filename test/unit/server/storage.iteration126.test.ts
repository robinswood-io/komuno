import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 126', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes budgets block with empty budget list and keeps budgetedExpenses at zero', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, []],
          [schema.financialExpenses, []],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2057);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.budgeted).toBe(0);
    }
  });
});
