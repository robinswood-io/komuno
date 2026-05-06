import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave33 archimedes', () => {
  it('throws Unknown error message when createEventWithInscriptions fails without error payload', async () => {
    const storageService = {
      instance: {
        createEventWithInscriptions: vi.fn(async () => ({
          success: false as const,
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const payload = {
      event: {
        title: 'Wave33 Event',
        description: 'Description wave33',
        date: '2099-12-31T09:00:00.000Z',
      },
      initialInscriptions: [],
    };

    await expect(service.createEventWithInscriptions(payload)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createEventWithInscriptions(payload)).rejects.toThrow('Unknown error');
  });
});
