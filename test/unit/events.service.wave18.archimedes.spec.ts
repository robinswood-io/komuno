import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave18 archimedes', () => {
  it('throws BadRequestException in getEventInscriptions when storage returns failure', async () => {
    const storageService = {
      instance: {
        getEventInscriptions: vi.fn(async () => ({
          success: false as const,
          error: new Error('inscriptions-fetch-failed'),
        })),
      },
    };

    const service = new EventsService(storageService as never);

    await expect(service.getEventInscriptions('evt-wave18')).rejects.toBeInstanceOf(BadRequestException);
  });
});
