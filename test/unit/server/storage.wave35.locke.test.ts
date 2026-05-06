import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave35 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createIdea returns DuplicateError when duplicate title is detected', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'isDuplicateIdea').mockResolvedValue(true);

    const result = await storage.createIdea({
      title: 'Wave35 duplicate',
      proposedBy: 'Locke',
      proposedByEmail: 'wave35@example.com',
    } as unknown as import('../../../shared/schema').InsertIdea);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('titre existe déjà');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });
});

