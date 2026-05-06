import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 50 - generateForecasts high-confidence month branch', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts month sets month=1 and high confidence when history count is 12+', async () => {
    const subscriptions = Array.from({ length: 12 }, (_value, index) => ({
      amountInCents: 100 + index,
      createdAt: `2027-${String((index % 12) + 1).padStart(2, '0')}-01T00:00:00.000Z`,
    }));

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, []],
          [schema.financialCategories, [{ id: 'cat-sub', name: 'Souscriptions annuelles' }]],
        ]),
      ),
    );

    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: () =>
          Promise.resolve([
            {
              id: 'f-high',
              ...value,
            },
          ]),
      }),
    }));

    const storage = createStorage();
    const result = await storage.generateForecasts('month', 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].confidence).toBe('high');
      expect(result.data[0].month).toBe(1);
      expect(result.data[0].quarter).toBeUndefined();
      expect(result.data[0].forecastedAmountInCents).toBe(106);
    }
  });
});

