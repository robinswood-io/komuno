import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 101', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateCategory returns NotFoundError when update returns empty after existing pre-check', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map<unknown, unknown[]>([[schema.financialCategories, [{ id: 'cat-101' }]]])),
    );

    mockDb.update.mockReturnValue({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [],
        }),
      }),
    });

    const storage = createStorage();
    const result = await storage.updateCategory('cat-101', { name: 'Updated 101' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Catégorie non trouvée');
    }
  });
});
