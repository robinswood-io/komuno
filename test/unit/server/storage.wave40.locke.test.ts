import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave40 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getEvent returns DatabaseError when select throws', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('wave40-select-event-failure');
    });

    const storage = createStorage();
    const result = await storage.getEvent('wave40-event');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("récupération de l'événement");
    }
  });
});

