import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';
import { notificationService } from '../../server/notification-service';
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

describe('EventsService wave15 archimedes', () => {
  it('keeps createEvent successful when notification throws and logs warning', async () => {
    vi.mocked(notificationService.notifyNewEvent).mockRejectedValueOnce(new Error('wave15-notif-fail'));

    const storageService = {
      instance: {
        createEvent: vi.fn(async () => ({
          success: true as const,
          data: {
            id: 'evt-wave15',
            title: 'Evenement Wave15',
            date: '2099-11-15T09:00:00.000Z',
            location: 'Nantes',
          },
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createEvent({
      title: 'Evenement Wave15',
      description: 'Description wave15',
      date: '2099-11-15T09:00:00.000Z',
    });

    expect(result.id).toBe('evt-wave15');
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      'Event notification failed',
      expect.objectContaining({ eventId: 'evt-wave15' }),
    );
  });
});
