import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave2 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getUser returns DatabaseError result when db.select throws', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('wave2-select-failure');
    });

    const storage = createStorage();
    const result = await storage.getUser('wave2@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération utilisateur');
    }
  });
});
