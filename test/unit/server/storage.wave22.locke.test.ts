import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js wave22 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getUser returns success with admin payload when found', async () => {
    const admin = { id: 'admin-wave22', email: 'wave22@example.com' };
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map<unknown, unknown[]>([[schema.admins, [admin]]])),
    );

    const storage = createStorage();
    const result = await storage.getUser('wave22@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(admin);
    }
  });
});

