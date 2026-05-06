import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave8 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getPendingAdmins returns DatabaseError when select fails', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('wave8-select-failure');
    });

    const storage = createStorage();
    const result = await storage.getPendingAdmins();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('comptes en attente');
    }
  });
});
