import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js wave31 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getIdea returns success with null when idea does not exist', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map<unknown, unknown[]>([[schema.ideas, []]])),
    );

    const storage = createStorage();
    const result = await storage.getIdea('wave31-missing-idea');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });
});

