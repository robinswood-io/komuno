import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave47 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createEvent returns success when duplicate check is false and transaction inserts row', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(false);

    const insertedEvent = { id: 'wave47-event', title: 'Wave47 Event' };
    const tx = {
      insert: (_table: unknown) => ({
        values: (_values: unknown[]) => ({
          returning: async () => [insertedEvent],
        }),
      }),
    };

    mockDb.transaction.mockImplementation(async (callback: (txArg: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const result = await storage.createEvent({
      title: 'Wave47 Event',
      description: null,
      date: '2031-06-10T10:30:00.000Z',
      location: 'Salle C',
      maxParticipants: 100,
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

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(insertedEvent);
    }
  });
});
