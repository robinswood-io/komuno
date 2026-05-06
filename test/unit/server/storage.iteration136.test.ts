import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 136', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('forces actualRevenues reassignment from filtered subscriptions reduce (line 3988)', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1200, createdAt: '2054-01-01T00:00:00.000Z' },
              { amountInCents: 350, createdAt: '2053-01-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, []],
          [schema.financialExpenses, []],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2054);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(1200);
    }
  });
});
