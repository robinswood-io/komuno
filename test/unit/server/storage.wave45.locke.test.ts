import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave45 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createEvent returns DuplicateError when duplicate title+date is detected', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(true);

    const result = await storage.createEvent({
      title: 'Wave45 Event',
      description: null,
      date: '2030-01-02T09:00:00.000Z',
      location: 'Salle A',
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
      expect(result.error.name).toBe('DuplicateError');
    }
  });
});
