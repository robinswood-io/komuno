import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave33 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('isDuplicateIdea returns true when one matching row is found', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'wave33-existing-idea' }],
        }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.isDuplicateIdea('Duplicate title wave33');

    expect(result).toBe(true);
  });
});

