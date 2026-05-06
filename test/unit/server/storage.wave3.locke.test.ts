import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave3 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createUser returns DuplicateError and skips insert when user already exists', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getUser').mockResolvedValue({
      success: true,
      data: { id: 'existing-admin' } as unknown,
    });

    const input = { email: 'duplicate@example.com' } as import('../../../shared/schema').InsertUser;
    const result = await storage.createUser(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('Utilisateur déjà existant');
    }
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
