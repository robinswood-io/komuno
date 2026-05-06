import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave25 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateAdminRole returns success when row is returned', async () => {
    const updatedAdmin = { id: 'admin-wave25', email: 'wave25@example.com', role: 'editor' };
    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [updatedAdmin],
        }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.updateAdminRole('wave25@example.com', 'editor');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedAdmin);
    }
  });
});

