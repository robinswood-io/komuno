import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 77', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes getFinancialKPIsExtended yearly actual revenue reduction lines with mixed year rows', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 100, createdAt: '2027-01-01T00:00:00.000Z' },
              { amountInCents: 900, createdAt: '2028-01-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 50, status: 'completed', createdAt: '2027-02-01T00:00:00.000Z' },
              { amount: 300, status: 'confirmed', createdAt: '2028-02-01T00:00:00.000Z' },
            ],
          ],
          [schema.financialForecasts, [{ year: 2028, forecastedAmountInCents: 1000 }]],
          [schema.financialExpenses, [{ amountInCents: 200, expenseDate: '2028-03-01' }]],
          [schema.financialBudgets, [{ year: 2028, amountInCents: 400 }]],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(1200);
    }
  });
});
