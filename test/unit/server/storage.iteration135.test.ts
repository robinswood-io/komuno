import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 135', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes sponsorship year comparison false-path in callback (line 3986)', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [
            schema.eventSponsorships,
            [
              { amount: 800, status: 'completed', createdAt: '2040-01-01T00:00:00.000Z' },
              { amount: 200, status: 'confirmed', createdAt: '2041-01-01T00:00:00.000Z' },
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
      expect(result.data.revenues.actual).toBe(0);
    }
  });
});
