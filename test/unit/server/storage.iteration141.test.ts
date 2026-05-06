import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 141', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('combines yearly filters for subs/sponsorships/expenses to re-hit zone 3981..4004 in one scenario', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 100, createdAt: '2059-01-01T00:00:00.000Z' },
              { amountInCents: 800, createdAt: '2058-01-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 200, status: 'confirmed', createdAt: '2059-04-01T00:00:00.000Z' },
              { amount: 500, status: 'completed', createdAt: '2057-04-01T00:00:00.000Z' },
            ],
          ],
          [schema.financialForecasts, [{ year: 2059, forecastedAmountInCents: 1000 }]],
          [
            schema.financialExpenses,
            [
              { amountInCents: 50, expenseDate: '2059-09-01' },
              { amountInCents: 900, expenseDate: '2057-09-01' },
            ],
          ],
          [schema.financialBudgets, [{ year: 2059, amountInCents: 60 }]],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2059);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(300);
      expect(result.data.expenses.actual).toBe(50);
    }
  });
});
