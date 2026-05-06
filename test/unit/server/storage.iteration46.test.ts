import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 46 - getForecasts filtering/sorting', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getForecasts filters by period/year/category and sorts newest first in same year', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.financialForecasts,
            [
              { id: 'f-old', period: 'year', year: 2025, category: 'cat-A', createdAt: '2025-01-01T00:00:00.000Z' },
              { id: 'f-new', period: 'year', year: 2025, category: 'cat-A', createdAt: '2025-12-01T00:00:00.000Z' },
              { id: 'f-other-period', period: 'month', year: 2025, category: 'cat-A', createdAt: '2025-06-01T00:00:00.000Z' },
              { id: 'f-other-category', period: 'year', year: 2025, category: 'cat-B', createdAt: '2025-11-01T00:00:00.000Z' },
              { id: 'f-other-year', period: 'year', year: 2024, category: 'cat-A', createdAt: '2024-11-01T00:00:00.000Z' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getForecasts({ period: 'year', year: 2025, category: 'cat-A' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((f) => f.id)).toEqual(['f-new', 'f-old']);
    }
  });

  it('getForecasts with empty options returns year-desc sorted rows', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.financialForecasts,
            [
              { id: 'f-y2024', period: 'year', year: 2024, category: 'cat-A', createdAt: '2024-06-01T00:00:00.000Z' },
              { id: 'f-y2026', period: 'year', year: 2026, category: 'cat-A', createdAt: '2026-01-01T00:00:00.000Z' },
              { id: 'f-y2025', period: 'year', year: 2025, category: 'cat-A', createdAt: '2025-01-01T00:00:00.000Z' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getForecasts(undefined);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((f) => f.id)).toEqual(['f-y2026', 'f-y2025', 'f-y2024']);
    }
  });
});

