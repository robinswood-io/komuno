import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave21 archimedes', () => {
  it('throws BadRequestException in createEvent when storage fails with explicit error', async () => {
    const storageService = {
      instance: {
        createEvent: vi.fn(async () => ({
          success: false as const,
          error: new Error('wave21-create-event-failure'),
        })),
      },
    };

    const service = new EventsService(storageService as never);

    await expect(
      service.createEvent({
        title: 'Wave21 Event',
        description: 'Valid payload for wave21',
        date: '2099-12-21T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
