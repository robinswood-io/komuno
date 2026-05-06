import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 122', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes sponsorship yearly filter callback line for matching and non-matching years', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [
            schema.eventSponsorships,
            [
              { amount: 300, status: 'completed', createdAt: '2053-04-01T00:00:00.000Z' },
              { amount: 900, status: 'completed', createdAt: '2052-04-01T00:00:00.000Z' },
            ],
          ],
          [schema.financialForecasts, []],
          [schema.financialExpenses, []],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2053);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(300);
    }
  });
});
