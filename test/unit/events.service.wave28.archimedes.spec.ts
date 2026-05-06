import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave28 archimedes', () => {
  it('throws Unknown error message in createUnsubscription when storage fails without error payload', async () => {
    const storageService = {
      instance: {
        createUnsubscription: vi.fn(async () => ({
          success: false as const,
        })),
      },
    };

    const service = new EventsService(storageService as never);

    await expect(
      service.createUnsubscription({
        eventId: 'cba4c1de-2df0-40ab-b8cd-c9eb55bebf6c',
        name: 'Wave Twenty Eight',
        email: 'wave28@example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createUnsubscription({
        eventId: 'cba4c1de-2df0-40ab-b8cd-c9eb55bebf6c',
        name: 'Wave Twenty Eight',
        email: 'wave28@example.com',
      }),
    ).rejects.toThrow('Unknown error');
  });
});
