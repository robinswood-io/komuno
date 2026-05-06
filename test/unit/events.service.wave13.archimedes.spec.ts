import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave13 archimedes', () => {
  it('falls back to generic event title in createUnsubscription when event lookup fails', async () => {
    const trackMemberActivityMock = vi.fn(async () => ({ success: true }));

    const storageService = {
      instance: {
        createUnsubscription: vi.fn(async () => ({
          success: true as const,
          data: { id: 'unsub-wave13' },
        })),
        getEvent: vi.fn(async () => ({
          success: false as const,
          error: new Error('wave13-event-not-found'),
        })),
        createOrUpdateMember: vi.fn(async () => ({ success: true })),
        trackMemberActivity: trackMemberActivityMock,
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createUnsubscription({
      eventId: '7eb102ba-0e0f-4f7d-aa2f-d4bb8eeac9cf',
      name: 'Wave Thirteen',
      email: 'wavethirteen@example.com',
      comments: 'Indisponible',
    });

    expect(result.id).toBe('unsub-wave13');
    expect(trackMemberActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTitle: 'Événement',
        activityType: 'event_unregistered',
      }),
    );
  });
});
