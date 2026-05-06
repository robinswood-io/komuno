import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 127', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('takes no-year branch for revenue recomputation guard (if year false)', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 300, createdAt: '2058-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 200, status: 'completed', createdAt: '2057-01-01T00:00:00.000Z' }]],
          [schema.financialForecasts, []],
          [schema.financialExpenses, []],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', undefined);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(500);
    }
  });
});
