import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';
import { notificationService } from '../../server/notification-service';
import { emailNotificationService } from '../../server/email-notification-service';
import { logger } from '../../server/lib/logger';

vi.mock('../../server/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../server/notification-service', () => ({
  notificationService: {
    notifyNewEvent: vi.fn(),
  },
}));

vi.mock('../../server/email-notification-service', () => ({
  emailNotificationService: {
    notifyNewEvent: vi.fn(),
  },
}));

describe('EventsService wave43 archimedes', () => {
  it('keeps createEventWithInscriptions successful when email notification fails after event notification', async () => {
    vi.mocked(notificationService.notifyNewEvent).mockResolvedValueOnce(undefined);
    vi.mocked(emailNotificationService.notifyNewEvent).mockRejectedValueOnce(new Error('wave43-email-failure'));

    const storageService = {
      instance: {
        createEventWithInscriptions: vi.fn(async () => ({
          success: true as const,
          data: {
            event: {
              id: 'evt-wave43',
              title: 'Wave43 Event',
              date: '2099-12-31T15:00:00.000Z',
              location: 'Paris',
            },
            initialInscriptions: [],
          },
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createEventWithInscriptions({
      event: {
        title: 'Wave43 Event',
        description: 'Description wave43',
        date: '2099-12-31T15:00:00.000Z',
      },
      initialInscriptions: [],
    });

    expect(result.event.id).toBe('evt-wave43');
    expect(vi.mocked(notificationService.notifyNewEvent)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(emailNotificationService.notifyNewEvent)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      'Event notification failed',
      expect.objectContaining({ eventId: 'evt-wave43' }),
    );
  });
});
