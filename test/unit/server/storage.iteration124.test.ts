import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 124', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes yearly filtered expenses reduction assignment path', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 250, expenseDate: '2055-03-01' },
              { amountInCents: 600, expenseDate: '2054-03-01' },
            ],
          ],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2055);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.actual).toBe(250);
    }
  });
});
