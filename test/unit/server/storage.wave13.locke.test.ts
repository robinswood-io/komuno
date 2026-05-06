import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave13 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateAdminInfo returns DatabaseError when db.update throws', async () => {
    mockDb.update.mockImplementation(() => {
      throw new Error('wave13-update-failure');
    });

    const storage = createStorage();
    const result = await storage.updateAdminInfo('wave13@example.com', {
      firstName: 'Wave',
      lastName: 'Thirteen',
      notificationEmail: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('mise à jour des informations');
    }
  });
});

