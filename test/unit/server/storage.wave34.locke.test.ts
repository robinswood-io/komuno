import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave34 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('isDuplicateIdea returns false on database failure (fail-safe)', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('wave34-duplicate-check-failure');
    });

    const storage = createStorage();
    const result = await storage.isDuplicateIdea('Title wave34');

    expect(result).toBe(false);
  });
});

