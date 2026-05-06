import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave19 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateAdminStatus returns DatabaseError when db.update throws', async () => {
    mockDb.update.mockImplementation(() => {
      throw new Error('wave19-update-status-failure');
    });

    const storage = createStorage();
    const result = await storage.updateAdminStatus('wave19@example.com', false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('mise à jour du statut');
    }
  });
});

