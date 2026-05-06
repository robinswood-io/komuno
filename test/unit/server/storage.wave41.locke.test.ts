import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave41 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getEvent returns success with null when event does not exist', async () => {
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: async (_clause: unknown) => [],
      }),
    });

    const storage = createStorage();
    const result = await storage.getEvent('wave41-event');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });
});
