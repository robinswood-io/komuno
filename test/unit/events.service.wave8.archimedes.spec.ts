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

describe('EventsService wave8 archimedes', () => {
  it('uses string-date branch and fallback location in createEventWithInscriptions notifications', async () => {
    vi.mocked(notificationService.notifyNewEvent).mockResolvedValueOnce(undefined);
    vi.mocked(emailNotificationService.notifyNewEvent).mockResolvedValueOnce(undefined);

    const storageService = {
      instance: {
        createEventWithInscriptions: vi.fn(async () => ({
          success: true as const,
          data: {
            event: {
              id: 'evt-wave8',
              title: 'Evenement Wave8',
              date: '2099-11-01T19:00:00.000Z',
              location: '',
            },
            initialInscriptions: [],
          },
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const payload = {
      event: {
        title: 'Evenement Wave8',
        description: 'Description wave8',
        date: '2099-11-01T19:00:00.000Z',
      },
      initialInscriptions: [],
    };

    const result = await service.createEventWithInscriptions(payload, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada.wave8@example.com',
    });

    expect(result.event.id).toBe('evt-wave8');
    expect(vi.mocked(notificationService.notifyNewEvent)).toHaveBeenCalledWith({
      title: 'Evenement Wave8',
      date: '2099-11-01T19:00:00.000Z',
      location: 'Lieu à définir',
    });
    expect(vi.mocked(emailNotificationService.notifyNewEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-wave8' }),
      'Ada Lovelace',
    );
  });
});
