import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 49 - generateForecasts low-confidence branch', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts creates low-confidence historical forecast when no matching history exists', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 1000, createdAt: '2028-03-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, []],
          [schema.financialCategories, [{ id: 'cat-other', name: 'Autres revenus' }]],
        ]),
      ),
    );

    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: () =>
          Promise.resolve([
            {
              id: 'f-low',
              ...value,
            },
          ]),
      }),
    }));

    const storage = createStorage();
    const result = await storage.generateForecasts('year', 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].confidence).toBe('low');
      expect(result.data[0].forecastedAmountInCents).toBe(0);
      expect(result.data[0].notes).toContain('0 données historiques');
    }
  });
});

