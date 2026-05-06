import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 139', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes filtered expenses reduction assignment to zero when no year match (line 4004)', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 500, expenseDate: '2050-06-01' },
              { amountInCents: 600, expenseDate: '2051-06-01' },
            ],
          ],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2057);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.actual).toBe(0);
    }
  });
});
