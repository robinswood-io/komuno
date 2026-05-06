import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave17 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateAdminInfo returns NotFoundError when update returns no row', async () => {
    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [],
        }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.updateAdminInfo('missing17@example.com', {
      firstName: 'Missing',
      lastName: 'Admin',
      notificationEmail: 'notify17@example.com',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Administrateur non trouvé');
    }
  });
});

