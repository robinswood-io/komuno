import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave26 archimedes', () => {
  it('throws BadRequestException in deleteEvent when storage error is not NotFoundError', async () => {
    const storageService = {
      instance: {
        deleteEvent: vi.fn(async () => ({
          success: false as const,
          error: new Error('wave26-delete-failure'),
        })),
      },
    };

    const service = new EventsService(storageService as never);

    await expect(service.deleteEvent('evt-wave26')).rejects.toBeInstanceOf(BadRequestException);
  });
});
