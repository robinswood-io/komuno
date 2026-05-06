import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave12 archimedes', () => {
  it('falls back to generic event title in createInscription when fetched title is empty', async () => {
    const trackMemberActivityMock = vi.fn(async () => ({ success: true }));

    const storageService = {
      instance: {
        createInscription: vi.fn(async () => ({
          success: true as const,
          data: { id: 'insc-wave12' },
        })),
        getEvent: vi.fn(async () => ({
          success: true as const,
          data: { title: '' },
        })),
        createOrUpdateMember: vi.fn(async () => ({ success: true })),
        trackMemberActivity: trackMemberActivityMock,
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createInscription({
      eventId: '90e7a7f7-6522-4af2-8d78-cf84da0f8f48',
      name: 'Wave Twelve',
      email: 'wavetwelve@example.com',
      company: 'CJD',
      phone: '+33102030405',
    });

    expect(result.id).toBe('insc-wave12');
    expect(trackMemberActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTitle: 'Événement',
        activityType: 'event_registered',
      }),
    );
  });
});
