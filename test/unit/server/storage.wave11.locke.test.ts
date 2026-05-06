import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave11 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getAllAdmins returns success with ordered admin list', async () => {
    const adminsList = [
      { id: 'admin-wave11-1', email: 'a11@example.com' },
      { id: 'admin-wave11-2', email: 'b11@example.com' },
    ];

    mockDb.select.mockImplementation(() => ({
      from: () => ({
        orderBy: async () => adminsList,
      }),
    }));

    const storage = createStorage();
    const result = await storage.getAllAdmins();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(adminsList);
    }
  });
});

