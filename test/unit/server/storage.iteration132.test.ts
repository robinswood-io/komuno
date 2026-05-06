import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 132', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes subscription yearly filter callback with a Date instance (line 3981/3982)', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 300, createdAt: new Date('2051-01-01T00:00:00.000Z') },
              { amountInCents: 900, createdAt: new Date('2050-01-01T00:00:00.000Z') },
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
    const result = await storage.getFinancialKPIsExtended('year', 2051);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(300);
    }
  });
});
