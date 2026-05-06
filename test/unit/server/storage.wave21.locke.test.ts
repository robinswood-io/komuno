import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js wave21 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getUser returns success with null when no admin matches email', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map<unknown, unknown[]>([[schema.admins, []]])),
    );

    const storage = createStorage();
    const result = await storage.getUser('wave21-missing@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });
});

