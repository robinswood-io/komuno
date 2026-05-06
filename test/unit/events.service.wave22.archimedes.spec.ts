import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave22 archimedes', () => {
  it('throws Unknown error message in createEvent when storage fails without error payload', async () => {
    const storageService = {
      instance: {
        createEvent: vi.fn(async () => ({
          success: false as const,
        })),
      },
    };

    const service = new EventsService(storageService as never);

    await expect(
      service.createEvent({
        title: 'Wave22 Event',
        description: 'Valid payload for wave22',
        date: '2099-12-22T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createEvent({
        title: 'Wave22 Event',
        description: 'Valid payload for wave22',
        date: '2099-12-22T10:00:00.000Z',
      }),
    ).rejects.toThrow('Unknown error');
  });
});
