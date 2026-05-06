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

describe('EventsService wave11 archimedes', () => {
  it('uses default organizer label in createEventWithInscriptions when user is missing', async () => {
    vi.mocked(notificationService.notifyNewEvent).mockResolvedValueOnce(undefined);
    vi.mocked(emailNotificationService.notifyNewEvent).mockResolvedValueOnce(undefined);

    const storageService = {
      instance: {
        createEventWithInscriptions: vi.fn(async () => ({
          success: true as const,
          data: {
            event: {
              id: 'evt-wave11',
              title: 'Evenement Wave11',
              date: '2099-12-12T18:00:00.000Z',
              location: 'Lille',
            },
            initialInscriptions: [],
          },
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createEventWithInscriptions({
      event: {
        title: 'Evenement Wave11',
        description: 'Description wave11',
        date: '2099-12-12T18:00:00.000Z',
      },
      initialInscriptions: [],
    });

    expect(result.event.id).toBe('evt-wave11');
    expect(vi.mocked(emailNotificationService.notifyNewEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-wave11' }),
      'Organisateur inconnu',
    );
  });
});
