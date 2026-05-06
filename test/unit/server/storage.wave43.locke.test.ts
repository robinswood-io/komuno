import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave43 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('isDuplicateEvent returns true when one matching row is found', async () => {
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: (_clause: unknown) => ({
          limit: async (_limit: number) => [{ id: 'wave43-duplicate' }],
        }),
      }),
    });

    const storage = createStorage();
    const result = await storage.isDuplicateEvent('Wave43', new Date('2030-01-01T10:00:00.000Z'));

    expect(result).toBe(true);
  });
});
