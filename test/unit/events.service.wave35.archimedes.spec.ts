import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave35 archimedes', () => {
  it('throws Unknown error message when deleteEvent fails without error payload', async () => {
    const storageService = {
      instance: {
        deleteEvent: vi.fn(async () => ({
          success: false as const,
        })),
      },
    };

    const service = new EventsService(storageService as never);

    await expect(service.deleteEvent('evt-wave35')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.deleteEvent('evt-wave35')).rejects.toThrow('Unknown error');
  });
});
