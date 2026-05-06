import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave48 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createInscription returns ValidationError when participant limit is reached', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'hasUserRegistered').mockResolvedValue(false);
    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: { id: 'wave48-event', maxParticipants: 1 } as unknown,
    });
    vi.spyOn(storage, 'getEventInscriptions').mockResolvedValue({
      success: true,
      data: [{ id: 'existing-inscription' } as unknown],
    });

    const result = await storage.createInscription({
      eventId: 'wave48-event',
      name: 'Locke',
      email: 'wave48@example.com',
      comment: null,
    } as unknown as import('../../../shared/schema').InsertInscription);

    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.message).toContain('événement est complet');
    }
  });
});
