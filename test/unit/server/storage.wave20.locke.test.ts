import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave20 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('deleteAdmin returns success when delete returning contains one row', async () => {
    mockDb.delete.mockImplementation(() => ({
      where: () => ({
        returning: async () => [{ id: 'admin-wave20-1' }],
      }),
    }));

    const storage = createStorage();
    const result = await storage.deleteAdmin('wave20@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });
});

