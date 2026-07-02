import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EventsService } from '../../server/src/events/events.service';

vi.mock('../../server/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../server/notification-service', () => ({
  notificationService: {
    notifyNewEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../server/email-notification-service', () => ({
  emailNotificationService: {
    notifyNewEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../shared/schema', async () => {
  const actual = await vi.importActual('../../shared/schema');
  return {
    ...actual,
    insertEventSchema: { parse: vi.fn((data) => data) },
  };
});

describe('EventsService iteration143', () => {
  let eventsService: EventsService;
  let mockStorageService: {
    instance: {
      createEvent: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageService = {
      instance: {
        createEvent: vi.fn(),
      },
    };
    eventsService = new EventsService(mockStorageService as unknown);
  });

  it('uses fallback organizerName from user.email and keeps success on notification warning path', async () => {
    const { notificationService } = await import('../../server/notification-service');
    const { emailNotificationService } = await import('../../server/email-notification-service');

    (notificationService.notifyNewEvent as unknown).mockRejectedValueOnce(new Error('notif-fail-143'));

    const eventDate = new Date('2099-02-20T18:30:00.000Z');
    mockStorageService.instance.createEvent.mockResolvedValue({
      success: true,
      data: {
        id: 'evt-143',
        title: 'Event 143',
        date: eventDate,
        location: 'Amiens',
      },
    });

    const result = await eventsService.createEvent(
      {
        title: 'Event 143',
        description: 'Desc',
        date: eventDate.toISOString(),
      },
      { email: 'organizer143@example.com' },
    );

    expect(result.id).toBe('evt-143');
    expect(emailNotificationService.notifyNewEvent).not.toHaveBeenCalled();
  });

  it('uses user.email as organizerName when first/last names are absent and notifications succeed', async () => {
    const { notificationService } = await import('../../server/notification-service');
    const { emailNotificationService } = await import('../../server/email-notification-service');

    (notificationService.notifyNewEvent as unknown).mockResolvedValueOnce(undefined);
    (emailNotificationService.notifyNewEvent as unknown).mockResolvedValueOnce({ success: true });

    const eventDate = new Date('2099-04-10T10:15:00.000Z');
    mockStorageService.instance.createEvent.mockResolvedValue({
      success: true,
      data: {
        id: 'evt-143-b',
        title: 'Event 143 B',
        date: eventDate,
        location: 'Lille',
      },
    });

    const result = await eventsService.createEvent(
      {
        title: 'Event 143 B',
        date: eventDate.toISOString(),
      },
      { email: 'fallback143@example.com' },
    );

    expect(result.id).toBe('evt-143-b');
    expect(emailNotificationService.notifyNewEvent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-143-b' }),
      'fallback143@example.com',
    );
  });

  it('uses default organizerName when user identity data is missing', async () => {
    const { notificationService } = await import('../../server/notification-service');
    const { emailNotificationService } = await import('../../server/email-notification-service');

    (notificationService.notifyNewEvent as unknown).mockResolvedValueOnce(undefined);
    (emailNotificationService.notifyNewEvent as unknown).mockResolvedValueOnce({ success: true });

    const eventDate = new Date('2099-05-11T09:00:00.000Z');
    mockStorageService.instance.createEvent.mockResolvedValue({
      success: true,
      data: {
        id: 'evt-143-c',
        title: 'Event 143 C',
        date: eventDate,
        location: null,
      },
    });

    const result = await eventsService.createEvent({
      title: 'Event 143 C',
      date: eventDate.toISOString(),
    });

    expect(result.id).toBe('evt-143-c');
    expect(emailNotificationService.notifyNewEvent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-143-c' }),
      'Organisateur inconnu',
    );
  });
});
