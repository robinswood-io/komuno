import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave29 archimedes', () => {
  it('tracks unregistration activity with negative score impact when unsubscription succeeds', async () => {
    const trackMemberActivityMock = vi.fn(async () => ({ success: true }));

    const storageService = {
      instance: {
        createUnsubscription: vi.fn(async () => ({
          success: true as const,
          data: { id: 'unsub-wave29' },
        })),
        getEvent: vi.fn(async () => ({
          success: true as const,
          data: { title: 'Event Wave29' },
        })),
        createOrUpdateMember: vi.fn(async () => ({ success: true })),
        trackMemberActivity: trackMemberActivityMock,
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createUnsubscription({
      eventId: '311e0205-cf6c-446b-8f83-fb9ecad3ebf7',
      name: 'Wave Twenty Nine',
      email: 'wave29@example.com',
    });

    expect(result.id).toBe('unsub-wave29');
    expect(trackMemberActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: 'event_unregistered',
        entityType: 'event',
        scoreImpact: -3,
        entityTitle: 'Event Wave29',
      }),
    );
  });
});
