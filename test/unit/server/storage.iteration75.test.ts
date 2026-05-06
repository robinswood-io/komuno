import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 75', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('covers getFinancialComparison balance percent with negative baseline', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 200, createdAt: '2025-01-01T00:00:00.000Z' },
              { amountInCents: 1200, createdAt: '2026-01-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 500, expenseDate: '2025-01-01' },
              { amountInCents: 300, expenseDate: '2026-01-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison({ period: 'year', year: 2025 }, { period: 'year', year: 2026 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance.period1).toBe(-300);
      expect(result.data.balance.period2).toBe(900);
      expect(result.data.balance.changePercent).toBe(400);
    }
  });
});
