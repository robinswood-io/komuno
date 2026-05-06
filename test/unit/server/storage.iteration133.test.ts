import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 133', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes subscription year comparison false-path in callback (line 3982)', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 111, createdAt: '2049-02-01T00:00:00.000Z' },
              { amountInCents: 222, createdAt: '2048-02-01T00:00:00.000Z' },
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
    const result = await storage.getFinancialKPIsExtended('year', 2050);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(0);
    }
  });
});
