import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 58', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts creates high-confidence sponsoring forecast with quarter period', async () => {
    const sponsorships = Array.from({ length: 12 }, (_value, index) => ({
      amount: 100 + index,
      createdAt: `2026-${String((index % 12) + 1).padStart(2, '0')}-01T00:00:00.000Z`,
    }));

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [schema.eventSponsorships, sponsorships],
          [schema.financialCategories, [{ id: 'cat-sp', name: 'Sponsoring partenaires' }]],
        ]),
      ),
    );

    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: () => Promise.resolve([{ id: 'f-high-sp', ...value }]),
      }),
    }));

    const storage = createStorage();
    const result = await storage.generateForecasts('quarter', 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].confidence).toBe('high');
      expect(result.data[0].quarter).toBe(1);
      expect(result.data[0].month).toBeUndefined();
    }
  });
});
