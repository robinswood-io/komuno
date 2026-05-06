import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave18 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateAdminRole returns DatabaseError when db.update throws', async () => {
    mockDb.update.mockImplementation(() => {
      throw new Error('wave18-update-role-failure');
    });

    const storage = createStorage();
    const result = await storage.updateAdminRole('wave18@example.com', 'admin');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('mise à jour du rôle');
    }
  });
});

