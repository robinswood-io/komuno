import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave14 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getPendingAdmins returns success with pending admins list', async () => {
    const pendingAdmins = [
      { id: 'admin-wave14-1', email: 'pending14a@example.com', status: 'pending' },
      { id: 'admin-wave14-2', email: 'pending14b@example.com', status: 'pending' },
    ];

    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          orderBy: async () => pendingAdmins,
        }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.getPendingAdmins();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(pendingAdmins);
    }
  });
});

