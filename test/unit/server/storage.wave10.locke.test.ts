import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave10 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('deleteAdmin returns DatabaseError when delete throws', async () => {
    mockDb.delete.mockImplementation(() => {
      throw new Error('wave10-delete-failure');
    });

    const storage = createStorage();
    const result = await storage.deleteAdmin('wave10@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('suppression de l\'administrateur');
    }
  });
});
