import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave27 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getAllAdmins returns DatabaseError when select throws', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('wave27-select-failure');
    });

    const storage = createStorage();
    const result = await storage.getAllAdmins();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('récupération des administrateurs');
    }
  });
});

