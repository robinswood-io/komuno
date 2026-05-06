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

describe('EventsService wave14 archimedes', () => {
  it('uses Date toISOString and full organizer name in createEvent notifications', async () => {
    vi.mocked(notificationService.notifyNewEvent).mockResolvedValueOnce(undefined);
    vi.mocked(emailNotificationService.notifyNewEvent).mockResolvedValueOnce(undefined);

    const eventDate = new Date('2099-11-14T10:30:00.000Z');

    const storageService = {
      instance: {
        createEvent: vi.fn(async () => ({
          success: true as const,
          data: {
            id: 'evt-wave14',
            title: 'Evenement Wave14',
            date: eventDate,
            location: undefined,
          },
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createEvent(
      {
        title: 'Evenement Wave14',
        description: 'Description wave14',
        date: eventDate.toISOString(),
      },
      {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      },
    );

    expect(result.id).toBe('evt-wave14');
    expect(vi.mocked(notificationService.notifyNewEvent)).toHaveBeenCalledWith({
      title: 'Evenement Wave14',
      date: '2099-11-14T10:30:00.000Z',
      location: 'Lieu à définir',
    });
    expect(vi.mocked(emailNotificationService.notifyNewEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-wave14' }),
      'Ada Lovelace',
    );
  });
});
