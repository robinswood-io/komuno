import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave42 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getEvent returns success with event payload when found', async () => {
    const eventRow = { id: 'wave42-event', title: 'Wave 42 Event' };

    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: async (_clause: unknown) => [eventRow],
      }),
    });

    const storage = createStorage();
    const result = await storage.getEvent('wave42-event');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(eventRow);
    }
  });
});
