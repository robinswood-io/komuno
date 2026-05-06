import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 134', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes sponsorship yearly filter callback with matching year (line 3985/3986)', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [
            schema.eventSponsorships,
            [
              { amount: 450, status: 'confirmed', createdAt: '2052-03-01T00:00:00.000Z' },
              { amount: 999, status: 'completed', createdAt: '2051-03-01T00:00:00.000Z' },
            ],
          ],
          [schema.financialForecasts, []],
          [schema.financialExpenses, []],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2052);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(450);
    }
  });
});
