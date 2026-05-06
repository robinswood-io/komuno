import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 123', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes filtered sponsorship reduction assignment when year is provided', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1200, createdAt: '2054-01-01T00:00:00.000Z' },
              { amountInCents: 800, createdAt: '2053-01-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 500, status: 'confirmed', createdAt: '2054-02-01T00:00:00.000Z' },
              { amount: 700, status: 'confirmed', createdAt: '2052-02-01T00:00:00.000Z' },
            ],
          ],
          [schema.financialForecasts, [{ year: 2054, forecastedAmountInCents: 1000 }]],
          [schema.financialExpenses, []],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2054);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(1700);
      expect(result.data.revenues.forecasted).toBe(1000);
    }
  });
});
