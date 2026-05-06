import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave44 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('isDuplicateEvent returns false on database failure (fail-safe)', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('wave44-duplicate-check-failure');
    });

    const storage = createStorage();
    const result = await storage.isDuplicateEvent('Wave44', new Date('2030-01-01T10:00:00.000Z'));

    expect(result).toBe(false);
  });
});
