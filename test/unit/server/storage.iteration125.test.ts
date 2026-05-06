import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 125', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes budgets selection/filter block with non-empty matching set', async () => {
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
              { year: 2056, amountInCents: 1000 },
              { year: 2056, amountInCents: 350 },
              { year: 2054, amountInCents: 9999 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2056);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.budgeted).toBe(1350);
    }
  });
});
