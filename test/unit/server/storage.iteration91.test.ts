import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema } from './storage.test-helpers';

describe('server/storage.js iteration 91', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createCategory returns inserted category on success', async () => {
    mockDb.insert.mockReturnValue({
      values: (payload: Record<string, unknown>) => ({
        returning: async () => [{ id: 'category-91', ...payload }],
      }),
    });

    const storage = createStorage();
    const result = await storage.createCategory({
      name: 'Innovation',
      type: 'expense',
      color: '#00AAFF',
      createdBy: 'admin-91',
    });

    expect(mockDb.insert).toHaveBeenCalledWith(schema.financialCategories);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('category-91');
      expect(result.data.name).toBe('Innovation');
    }
  });
});
