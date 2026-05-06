import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave23 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createUser returns DatabaseError when insert throws', async () => {
    mockDb.insert.mockImplementation(() => {
      throw new Error('wave23-insert-failure');
    });

    const storage = createStorage();
    vi.spyOn(storage, 'getUser').mockResolvedValue({ success: true, data: null });

    const input = { email: 'wave23@example.com' } as unknown as import('../../../shared/schema').InsertUser;
    const result = await storage.createUser(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('création utilisateur');
    }
  });
});

