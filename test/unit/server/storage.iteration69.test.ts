import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 69', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts recognizes Sponsoring category and computes low confidence for 2 rows', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [
            schema.eventSponsorships,
            [
              { amount: 100, createdAt: '2030-01-01T00:00:00.000Z' },
              { amount: 300, createdAt: '2030-02-01T00:00:00.000Z' },
            ],
          ],
          [schema.financialCategories, [{ id: 'cat-sp', name: 'Sponsoring Events' }]],
        ]),
      ),
    );

    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: () => Promise.resolve([{ id: 'f-sp', ...value }]),
      }),
    }));

    const storage = createStorage();
    const result = await storage.generateForecasts('year', 2031);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].forecastedAmountInCents).toBe(200);
      expect(result.data[0].confidence).toBe('low');
    }
  });
});
