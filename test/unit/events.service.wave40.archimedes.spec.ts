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

describe('EventsService wave40 archimedes', () => {
  it('uses user email as organizer name fallback in createEvent notifications', async () => {
    vi.mocked(notificationService.notifyNewEvent).mockResolvedValueOnce(undefined);
    vi.mocked(emailNotificationService.notifyNewEvent).mockResolvedValueOnce(undefined);

    const storageService = {
      instance: {
        createEvent: vi.fn(async () => ({
          success: true as const,
          data: {
            id: 'evt-wave40',
            title: 'Wave40 Event',
            date: '2099-12-31T12:00:00.000Z',
            location: 'Bordeaux',
          },
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createEvent(
      {
        title: 'Wave40 Event',
        description: 'Description wave40',
        date: '2099-12-31T12:00:00.000Z',
      },
      { email: 'organizer40@example.com' },
    );

    expect(result.id).toBe('evt-wave40');
    expect(vi.mocked(emailNotificationService.notifyNewEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-wave40' }),
      'organizer40@example.com',
    );
  });
});
