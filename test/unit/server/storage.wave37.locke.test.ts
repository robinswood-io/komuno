import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave37 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('deleteIdea propagates upstream error when getIdea fails', async () => {
    const storage = createStorage();
    const upstreamError = new Error('wave37-upstream-getIdea-failure');
    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: false,
      error: upstreamError,
    });

    const result = await storage.deleteIdea('wave37-idea');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(upstreamError);
    }
  });
});

