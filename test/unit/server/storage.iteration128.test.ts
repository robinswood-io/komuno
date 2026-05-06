import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 128', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('takes no-year branch for expenses recomputation guard (if year false)', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 100, expenseDate: '2058-05-01' },
              { amountInCents: 400, expenseDate: '2059-05-01' },
            ],
          ],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', undefined);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.actual).toBe(500);
    }
  });
});
