import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';

const dbSelectMock = vi.fn();

vi.mock('../../server/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../server/db', () => ({
  db: {
    select: dbSelectMock,
  },
}));

vi.mock('../../server/notification-service', () => ({
  notificationService: { notifyNewEvent: vi.fn() },
}));

vi.mock('../../server/email-notification-service', () => ({
  emailNotificationService: { notifyNewEvent: vi.fn() },
}));

vi.mock('../../shared/schema', async () => {
  const actual = await vi.importActual('../../shared/schema');
  return {
    ...actual,
    insertUnsubscriptionSchema: {
      parse: vi.fn((data) => {
        if (!data || !(data as { eventId?: string }).eventId) {
          throw new ZodError([]);
        }
        return data;
      }),
    },
  };
});

describe('EventsService iteration147', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws BadRequestException when events stats query fails', async () => {
    const { EventsService } = await import('../../server/src/events/events.service');

    dbSelectMock.mockImplementation(() => {
      throw new Error('stats-db-crash-147');
    });

    const service = new EventsService({ instance: {} } as never);

    await expect(service.getEventsStats()).rejects.toThrow(BadRequestException);
  });

  it('maps Zod validation error to BadRequestException in createUnsubscription', async () => {
    const { EventsService } = await import('../../server/src/events/events.service');

    const service = new EventsService({ instance: {} } as never);

    await expect(service.createUnsubscription({ email: 'missing-event-id@example.com' })).rejects.toThrow(BadRequestException);
  });

  it('continues when member activity tracking fails in createUnsubscription', async () => {
    const { EventsService } = await import('../../server/src/events/events.service');
    const { logger } = await import('../../server/lib/logger');

    const storageService = {
      instance: {
        createUnsubscription: vi.fn(async () => ({ success: true, data: { id: 'unsub-147' } })),
        getEvent: vi.fn(async () => ({ success: true, data: { title: 'Event 147' } })),
        createOrUpdateMember: vi.fn(async () => {
          throw new Error('member-upsert-failed-147');
        }),
        trackMemberActivity: vi.fn(async () => ({ success: true })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createUnsubscription({
      eventId: 'evt-147',
      email: 'user147@example.com',
      name: 'User 147',
    });

    expect(result.id).toBe('unsub-147');
    expect(logger.error).toHaveBeenCalledWith(
      'Member activity tracking failed',
      expect.objectContaining({ email: 'user147@example.com', activityType: 'event_unregistered' }),
    );
  });
});
