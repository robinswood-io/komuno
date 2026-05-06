import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave17 archimedes', () => {
  it('throws NotFoundException in deleteEvent when storage reports NotFoundError', async () => {
    const storageService = {
      instance: {
        deleteEvent: vi.fn(async () => ({
          success: false as const,
          error: Object.assign(new Error('event missing'), { name: 'NotFoundError' }),
        })),
      },
    };

    const service = new EventsService(storageService as never);

    await expect(service.deleteEvent('evt-wave17')).rejects.toBeInstanceOf(NotFoundException);
  });
});
