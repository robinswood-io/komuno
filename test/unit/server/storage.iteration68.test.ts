import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 68', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts recognizes lowercase souscriptions category name', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 800, createdAt: '2030-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, []],
          [schema.financialCategories, [{ id: 'cat-lc', name: 'souscriptions locales' }]],
        ]),
      ),
    );

    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: () => Promise.resolve([{ id: 'f-lc', ...value }]),
      }),
    }));

    const storage = createStorage();
    const result = await storage.generateForecasts('year', 2031);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].forecastedAmountInCents).toBe(800);
    }
  });
});
