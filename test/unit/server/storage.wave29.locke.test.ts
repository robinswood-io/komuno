import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave29 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateAdminInfo returns success when one row is updated', async () => {
    const updatedAdmin = {
      id: 'admin-wave29',
      email: 'wave29@example.com',
      firstName: 'Wave',
      lastName: 'TwentyNine',
    };

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [updatedAdmin],
        }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.updateAdminInfo('wave29@example.com', {
      firstName: 'Wave',
      lastName: 'TwentyNine',
      notificationEmail: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedAdmin);
    }
  });
});

