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

describe('EventsService wave7 archimedes', () => {
  it('keeps success and logs warn when createEventWithInscriptions notification fails', async () => {
    vi.mocked(notificationService.notifyNewEvent).mockRejectedValueOnce(new Error('notif-wave7-failure'));

    const storageService = {
      instance: {
        createEventWithInscriptions: vi.fn(async () => ({
          success: true as const,
          data: {
            event: {
              id: 'evt-wave7',
              title: 'Evenement Wave7',
              date: new Date('2099-09-15T18:00:00.000Z'),
              location: undefined,
            },
            initialInscriptions: [],
          },
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createEventWithInscriptions(
      {
        event: {
          title: 'Evenement Wave7',
          date: '2099-09-15T18:00:00.000Z',
          description: 'Description wave7',
        },
        initialInscriptions: [],
      },
      { email: 'organizer.wave7@example.com' },
    );

    expect(result.event.id).toBe('evt-wave7');
    expect(vi.mocked(emailNotificationService.notifyNewEvent)).not.toHaveBeenCalled();
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      'Event notification failed',
      expect.objectContaining({ eventId: 'evt-wave7' }),
    );
  });
});
