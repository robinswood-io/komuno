import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave32 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getIdea returns DatabaseError when select throws', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('wave32-select-idea-failure');
    });

    const storage = createStorage();
    const result = await storage.getIdea('wave32-idea');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("récupération de l'idée");
    }
  });
});

