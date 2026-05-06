import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 70', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts quarter sets quarter and low confidence for non-subs/sponsoring category', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 1000, createdAt: '2030-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 700, createdAt: '2030-02-01T00:00:00.000Z' }]],
          [schema.financialCategories, [{ id: 'cat-other', name: 'Dons divers' }]],
        ]),
      ),
    );

    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: () => Promise.resolve([{ id: 'f-q', ...value }]),
      }),
    }));

    const storage = createStorage();
    const result = await storage.generateForecasts('quarter', 2031);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].quarter).toBe(1);
      expect(result.data[0].month).toBeUndefined();
      expect(result.data[0].confidence).toBe('low');
      expect(result.data[0].forecastedAmountInCents).toBe(0);
    }
  });
});
