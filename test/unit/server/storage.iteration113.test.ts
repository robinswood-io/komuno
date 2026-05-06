import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 113', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialKPIsExtended keeps unfiltered totals when year is undefined', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 400, createdAt: '2038-01-01T00:00:00.000Z' },
              { amountInCents: 600, createdAt: '2039-01-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 100, status: 'completed', createdAt: '2038-05-01T00:00:00.000Z' },
              { amount: 150, status: 'confirmed', createdAt: '2039-05-01T00:00:00.000Z' },
            ],
          ],
          [schema.financialForecasts, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 250, expenseDate: '2038-02-01' },
              { amountInCents: 350, expenseDate: '2039-02-01' },
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
      expect(result.data.revenues.actual).toBe(1250);
      expect(result.data.expenses.actual).toBe(600);
    }
  });
});
