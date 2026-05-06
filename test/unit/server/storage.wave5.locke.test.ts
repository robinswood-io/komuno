import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave5 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createUser inserts and returns created user when no duplicate is found', async () => {
    mockDb.insert.mockImplementation(() => ({
      values: () => ({
        returning: async () => [{ id: 'wave5-created-user', email: 'wave5@example.com' }],
      }),
    }));

    const storage = createStorage();
    vi.spyOn(storage, 'getUser').mockResolvedValue({ success: true, data: null });

    const input = { email: 'wave5@example.com' } as unknown as import('../../../shared/schema').InsertUser;
    const result = await storage.createUser(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: 'wave5-created-user', email: 'wave5@example.com' });
    }
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});
