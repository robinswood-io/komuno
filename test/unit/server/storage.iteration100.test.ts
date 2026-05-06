import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 100', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialCategories without type sorts by type then name', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.financialCategories,
            [
              { id: 'c100-3', type: 'income', name: 'Zulu' },
              { id: 'c100-2', type: 'income', name: 'Alpha' },
              { id: 'c100-1', type: 'expense', name: 'Beta' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialCategories(undefined);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((c: { id: string }) => c.id)).toEqual(['c100-1', 'c100-2', 'c100-3']);
    }
  });
});
