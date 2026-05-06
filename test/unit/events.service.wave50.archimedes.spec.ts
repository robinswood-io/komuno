import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave50 archimedes', () => {
  it('stores empty lastName when unsubscription name contains a single word', async () => {
    const createOrUpdateMemberMock = vi.fn(async () => ({ success: true }));

    const storageService = {
      instance: {
        createUnsubscription: vi.fn(async () => ({
          success: true as const,
          data: { id: 'unsub-wave50' },
        })),
        getEvent: vi.fn(async () => ({
          success: true as const,
          data: { title: 'Event Wave50' },
        })),
        createOrUpdateMember: createOrUpdateMemberMock,
        trackMemberActivity: vi.fn(async () => ({ success: true })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createUnsubscription({
      eventId: 'cab5b370-4f89-4e65-b5a4-233f7d93066a',
      name: 'Singleword',
      email: 'wave50@example.com',
    });

    expect(result.id).toBe('unsub-wave50');
    expect(createOrUpdateMemberMock).toHaveBeenCalledWith({
      email: 'wave50@example.com',
      firstName: 'Singleword',
      lastName: '',
      company: undefined,
      phone: undefined,
    });
  });
});
