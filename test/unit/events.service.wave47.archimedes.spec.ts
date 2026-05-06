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

describe('EventsService wave47 archimedes', () => {
  it('keeps createInscription successful when trackMemberActivity storage call fails', async () => {
    const storageService = {
      instance: {
        createInscription: vi.fn(async () => ({
          success: true as const,
          data: { id: 'insc-wave47' },
        })),
        getEvent: vi.fn(async () => ({
          success: true as const,
          data: { title: 'Event Wave47' },
        })),
        createOrUpdateMember: vi.fn(async () => ({ success: true })),
        trackMemberActivity: vi.fn(async () => {
          throw new Error('wave47-track-failure');
        }),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createInscription({
      eventId: '22d4f304-7019-4e44-9878-081d6945e2fe',
      name: 'Wave Forty Seven',
      email: 'wave47@example.com',
    });

    expect(result.id).toBe('insc-wave47');
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      'Member activity tracking failed',
      expect.objectContaining({
        email: 'wave47@example.com',
        activityType: 'event_registered',
      }),
    );
  });
});
