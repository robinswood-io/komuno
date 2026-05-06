import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 129', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes getFinancialComparison main try block and inner calculatePeriodData function', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 700, createdAt: '2060-01-01T00:00:00.000Z' },
              { amountInCents: 1000, createdAt: '2061-01-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 100, status: 'confirmed', createdAt: '2060-03-01T00:00:00.000Z' },
              { amount: 200, status: 'confirmed', createdAt: '2061-03-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 300, expenseDate: '2060-02-01' },
              { amountInCents: 450, expenseDate: '2061-02-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2060 }, { period: 'year', year: 2061 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.period1).toBe(800);
      expect(result.data.revenues.period2).toBe(1200);
    }
  });
});
