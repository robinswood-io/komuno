import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave28 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getPendingAdmins returns success with empty list', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          orderBy: async () => [],
        }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.getPendingAdmins();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });
});

