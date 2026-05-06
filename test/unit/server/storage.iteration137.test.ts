import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 137', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('forces actualRevenues reassignment from filtered sponsorships reduce (line 3989)', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [
            schema.eventSponsorships,
            [
              { amount: 700, status: 'confirmed', createdAt: '2055-04-01T00:00:00.000Z' },
              { amount: 100, status: 'completed', createdAt: '2054-04-01T00:00:00.000Z' },
            ],
          ],
          [schema.financialForecasts, []],
          [schema.financialExpenses, []],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2055);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(700);
    }
  });
});
