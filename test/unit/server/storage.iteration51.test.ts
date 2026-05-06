import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 51 - generateForecasts quarter/exception paths', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts quarter sets quarter=1 and medium confidence from sponsorship history', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [
            schema.eventSponsorships,
            [
              { amount: 100, createdAt: '2026-01-01T00:00:00.000Z' },
              { amount: 200, createdAt: '2026-02-01T00:00:00.000Z' },
              { amount: 300, createdAt: '2026-03-01T00:00:00.000Z' },
              { amount: 400, createdAt: '2026-04-01T00:00:00.000Z' },
            ],
          ],
          [schema.financialCategories, [{ id: 'cat-sponsor', name: 'Sponsoring local' }]],
        ]),
      ),
    );

    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: () =>
          Promise.resolve([
            {
              id: 'f-med',
              ...value,
            },
          ]),
      }),
    }));

    const storage = createStorage();
    const result = await storage.generateForecasts('quarter', 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].confidence).toBe('medium');
      expect(result.data[0].quarter).toBe(1);
      expect(result.data[0].month).toBeUndefined();
      expect(result.data[0].forecastedAmountInCents).toBe(250);
    }
  });

  it('generateForecasts returns DatabaseError when select chain throws', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('generate-select-failed');
    });

    const storage = createStorage();
    const result = await storage.generateForecasts('year', 2028);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors de la génération des prévisions');
    }
  });
});

