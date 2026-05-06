import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';
import { logger } from '../../server/lib/logger';

vi.mock('../../server/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('EventsService wave49 archimedes', () => {
  it('keeps createUnsubscription successful when member upsert fails during activity tracking', async () => {
    const storageService = {
      instance: {
        createUnsubscription: vi.fn(async () => ({
          success: true as const,
          data: { id: 'unsub-wave49' },
        })),
        getEvent: vi.fn(async () => ({
          success: true as const,
          data: { title: 'Event Wave49' },
        })),
        createOrUpdateMember: vi.fn(async () => {
          throw new Error('wave49-member-upsert-failure');
        }),
        trackMemberActivity: vi.fn(async () => ({ success: true })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createUnsubscription({
      eventId: 'f7656e35-29fa-4bf8-84ff-e184dc2f6b8d',
      name: 'Wave Forty Nine',
      email: 'wave49@example.com',
    });

    expect(result.id).toBe('unsub-wave49');
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      'Member activity tracking failed',
      expect.objectContaining({
        email: 'wave49@example.com',
        activityType: 'event_unregistered',
      }),
    );
  });
});
