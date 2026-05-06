import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';
import { notificationService } from '../../server/notification-service';
import { emailNotificationService } from '../../server/email-notification-service';

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

describe('EventsService wave42 archimedes', () => {
  it('uses full organizer name in createEventWithInscriptions notification email', async () => {
    vi.mocked(notificationService.notifyNewEvent).mockResolvedValueOnce(undefined);
    vi.mocked(emailNotificationService.notifyNewEvent).mockResolvedValueOnce(undefined);

    const storageService = {
      instance: {
        createEventWithInscriptions: vi.fn(async () => ({
          success: true as const,
          data: {
            event: {
              id: 'evt-wave42',
              title: 'Wave42 Event',
              date: '2099-12-31T14:00:00.000Z',
              location: 'Lyon',
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
          title: 'Wave42 Event',
          description: 'Description wave42',
          date: '2099-12-31T14:00:00.000Z',
        },
        initialInscriptions: [],
      },
      {
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@example.com',
      },
    );

    expect(result.event.id).toBe('evt-wave42');
    expect(vi.mocked(emailNotificationService.notifyNewEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-wave42' }),
      'Grace Hopper',
    );
  });
});
