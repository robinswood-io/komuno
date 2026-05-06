import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 59', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts handles multiple income categories in one pass', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 600, createdAt: '2026-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 300, createdAt: '2026-02-01T00:00:00.000Z' }]],
          [
            schema.financialCategories,
            [
              { id: 'cat-sub', name: 'Souscriptions premium' },
              { id: 'cat-sp', name: 'Sponsoring local' },
              { id: 'cat-other', name: 'Autres revenus' },
            ],
          ],
        ]),
      ),
    );

    let counter = 0;
    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: () => {
          counter += 1;
          return Promise.resolve([{ id: `f-${counter}`, ...value }]);
        },
      }),
    }));

    const storage = createStorage();
    const result = await storage.generateForecasts('year', 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
    }
  });
});
