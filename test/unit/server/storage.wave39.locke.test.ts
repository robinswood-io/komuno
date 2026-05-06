import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave39 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('deleteIdea returns success when getIdea exists and transaction completes', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: { id: 'wave39-idea' } as unknown,
    });

    const tx = {
      delete: (_table: unknown) => ({
        where: async (_clause: unknown) => ({ rowCount: 1 }),
      }),
    };
    mockDb.transaction.mockImplementation(async (callback: (txArg: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const result = await storage.deleteIdea('wave39-idea');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });
});

