import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 60', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts monthly sets month field to 1 on generated payload', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 300, createdAt: '2026-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, []],
          [schema.financialCategories, [{ id: 'cat-sub', name: 'Souscriptions' }]],
        ]),
      ),
    );

    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: () => Promise.resolve([{ id: 'f-month', ...value }]),
      }),
    }));

    const storage = createStorage();
    const result = await storage.generateForecasts('month', 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].month).toBe(1);
      expect(result.data[0].quarter).toBeUndefined();
    }
  });
});
