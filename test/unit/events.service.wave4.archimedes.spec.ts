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
    insertUnsubscriptionSchema: {
      parse: vi.fn((data: unknown) => data),
    },
  };
});

describe('EventsService wave4 archimedes', () => {
  it('uses fallback event title when event exists but title is empty in createUnsubscription', async () => {
    const trackMemberActivityMock = vi.fn(async () => ({ success: true }));

    const storageService = {
      instance: {
        createUnsubscription: vi.fn(async () => ({
          success: true as const,
          data: { id: 'unsub-wave4' },
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

    const result = await service.createUnsubscription({
      eventId: 'd6f7d9df-e8f9-46b9-9707-2486f178449d',
      name: 'Wave Four',
      email: 'wave4@example.com',
      comments: 'Absent',
    });

    expect(result.id).toBe('unsub-wave4');
    expect(trackMemberActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTitle: 'Événement',
        activityType: 'event_unregistered',
      }),
    );
  });
});
