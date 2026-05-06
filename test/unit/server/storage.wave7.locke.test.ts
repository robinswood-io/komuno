import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave7 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateAdminPassword returns DatabaseError when db.update throws', async () => {
    mockDb.update.mockImplementation(() => {
      throw new Error('wave7-update-failure');
    });

    const storage = createStorage();
    const result = await storage.updateAdminPassword('wave7@example.com', 'hashed-password');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la mise à jour du mot de passe');
    }
  });
});
