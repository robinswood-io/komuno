import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave50 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createVote returns DuplicateError when an existing vote is found', async () => {
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: async (_clause: unknown) => [{ id: 'wave50-existing-vote' }],
      }),
    });

    const storage = createStorage();
    const result = await storage.createVote({
      ideaId: 'wave50-idea',
      voterName: 'Locke',
      voterEmail: 'wave50@example.com',
    } as unknown as import('../../../shared/schema').InsertVote);

    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
    }
  });
});
