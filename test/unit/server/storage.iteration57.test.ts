import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 57', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts creates low-confidence subscription forecast when history count is below 3', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1000, createdAt: '2026-01-01T00:00:00.000Z' },
              { amountInCents: 1200, createdAt: '2026-02-01T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [schema.financialCategories, [{ id: 'cat-sub', name: 'Souscriptions' }]],
        ]),
      ),
    );

    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: () => Promise.resolve([{ id: 'f-low-sub', ...value }]),
      }),
    }));

    const storage = createStorage();
    const result = await storage.generateForecasts('year', 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].confidence).toBe('low');
      expect(result.data[0].forecastedAmountInCents).toBe(1100);
    }
  });
});
