import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave46 archimedes', () => {
  it('throws Unknown error message in getEventInscriptions when storage fails without error payload', async () => {
    const storageService = {
      instance: {
        getEventInscriptions: vi.fn(async () => ({
          success: false as const,
        })),
      },
    };

    const service = new EventsService(storageService as never);

    await expect(service.getEventInscriptions('evt-wave46')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getEventInscriptions('evt-wave46')).rejects.toThrow('Unknown error');
  });
});
