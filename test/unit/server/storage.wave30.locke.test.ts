import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave30 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createUser still inserts when getUser returns success=false', async () => {
    const createdUser = { id: 'admin-wave30', email: 'wave30@example.com' };
    mockDb.insert.mockImplementation(() => ({
      values: () => ({
        returning: async () => [createdUser],
      }),
    }));

    const storage = createStorage();
    vi.spyOn(storage, 'getUser').mockResolvedValue({
      success: false,
      error: new Error('wave30-get-user-error'),
    });

    const input = { email: 'wave30@example.com' } as unknown as import('../../../shared/schema').InsertUser;
    const result = await storage.createUser(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(createdUser);
    }
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});

