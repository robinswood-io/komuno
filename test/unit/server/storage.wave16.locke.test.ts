import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave16 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateAdminPassword returns success when update executes without throwing', async () => {
    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: async () => ({ rowCount: 1 }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.updateAdminPassword('wave16@example.com', 'hashed-wave16');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });
});

