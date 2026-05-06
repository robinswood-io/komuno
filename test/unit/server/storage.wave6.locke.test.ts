import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave6 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('deleteAdmin returns NotFoundError when delete returning list is empty', async () => {
    mockDb.delete.mockImplementation(() => ({
      where: () => ({
        returning: async () => [],
      }),
    }));

    const storage = createStorage();
    const result = await storage.deleteAdmin('missing-wave6@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Administrateur introuvable');
    }
  });
});
