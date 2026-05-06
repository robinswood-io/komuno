import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

vi.mock('../../server/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../shared/schema', async () => {
  const actual = await vi.importActual<typeof import('../../shared/schema')>('../../shared/schema');
  return {
    ...actual,
    insertInscriptionSchema: {
      parse: vi.fn((data: unknown) => data),
    },
  };
});

describe('EventsService wave3 archimedes', () => {
  it('uses fallback event title when getEvent lookup fails in createInscription', async () => {
    const trackMemberActivityMock = vi.fn(async () => ({ success: true }));

    const storageService = {
      instance: {
        createInscription: vi.fn(async () => ({
          success: true as const,
          data: { id: 'insc-wave3' },
        })),
        getEvent: vi.fn(async () => ({
          success: false as const,
          error: new Error('wave3-event-missing'),
        })),
        createOrUpdateMember: vi.fn(async () => ({ success: true })),
        trackMemberActivity: trackMemberActivityMock,
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createInscription({
      eventId: '6f10f4fb-0c83-4697-95eb-6986cd7f6ca8',
      name: 'Wave Three',
      email: 'wave3@example.com',
      company: 'CJD',
      phone: '+33123456789',
    });

    expect(result.id).toBe('insc-wave3');
    expect(trackMemberActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTitle: 'Événement',
        activityType: 'event_registered',
      }),
    );
  });
});
