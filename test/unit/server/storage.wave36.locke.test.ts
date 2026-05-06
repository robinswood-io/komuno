import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState, schema } from './storage.test-helpers';

describe('server/storage.js wave36 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createIdea returns success when duplicate check is false and transaction inserts row', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'isDuplicateIdea').mockResolvedValue(false);

    const insertedIdea = { id: 'wave36-idea', title: 'Wave36 title' };
    const tx = {
      insert: (_table: unknown) => ({
        values: (_values: unknown[]) => ({
          returning: async () => [insertedIdea],
        }),
      }),
    };
    mockDb.transaction.mockImplementation(async (callback: (txArg: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const result = await storage.createIdea({
      title: 'Wave36 title',
      proposedBy: 'Locke',
      proposedByEmail: 'wave36@example.com',
      status: 'pending',
      featured: false,
      description: null,
      deadline: null,
    } as unknown as import('../../../shared/schema').InsertIdea);

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(insertedIdea);
    }
    expect(schema.ideas).toBeDefined();
  });
});

