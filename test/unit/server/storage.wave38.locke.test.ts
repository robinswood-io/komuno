import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave38 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('deleteIdea returns NotFoundError when getIdea succeeds with null data', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.deleteIdea('wave38-missing-idea');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Idée introuvable');
    }
  });
});

