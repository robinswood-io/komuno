import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave49 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createInscription returns NotFoundError when event does not exist', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'hasUserRegistered').mockResolvedValue(false);
    vi.spyOn(storage, 'getEvent').mockResolvedValue({ success: true, data: null });

    const result = await storage.createInscription({
      eventId: 'wave49-missing-event',
      name: 'Locke',
      email: 'wave49@example.com',
      comment: null,
    } as unknown as import('../../../shared/schema').InsertInscription);

    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
    }
  });
});
