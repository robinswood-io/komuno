import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave46 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createEvent returns ValidationError when date is not in the future', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(false);

    const result = await storage.createEvent({
      title: 'Wave46 Event',
      description: null,
      date: '2000-01-01T00:00:00.000Z',
      location: 'Salle B',
      maxParticipants: null,
      helloAssoLink: null,
      enableExternalRedirect: false,
      externalRedirectUrl: null,
      showInscriptionsCount: true,
      showAvailableSeats: true,
      allowUnsubscribe: true,
      redUnsubscribeButton: false,
      buttonMode: 'helloasso',
      customButtonText: null,
      status: 'draft',
      updatedBy: 'admin',
    } as unknown as import('../../../shared/schema').InsertEvent);

    expect(mockDb.transaction).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.message).toContain('doit être dans le futur');
    }
  });
});
