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

describe('EventsService wave19 archimedes', () => {
  it('keeps createInscription successful when member activity tracking fails internally', async () => {
    const storageService = {
      instance: {
        createInscription: vi.fn(async () => ({
          success: true as const,
          data: { id: 'insc-wave19' },
        })),
        getEvent: vi.fn(async () => ({
          success: true as const,
          data: { title: 'Event Wave19' },
        })),
        createOrUpdateMember: vi.fn(async () => {
          throw new Error('member-upsert-failed');
        }),
        trackMemberActivity: vi.fn(async () => ({ success: true })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createInscription({
      eventId: '67d6e875-22bf-46fb-8f67-59629997d9c5',
      name: 'Wave Nineteen',
      email: 'wave19@example.com',
    });

    expect(result.id).toBe('insc-wave19');
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      'Member activity tracking failed',
      expect.objectContaining({
        email: 'wave19@example.com',
        activityType: 'event_registered',
      }),
    );
  });
});
