import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave6 archimedes', () => {
  it('throws BadRequestException in createUnsubscription when storage reports failure', async () => {
    const storageService = {
      instance: {
        createUnsubscription: vi.fn(async () => ({
          success: false as const,
          error: new Error('duplicate-unsubscription-wave6'),
        })),
      },
    };

    const service = new EventsService(storageService as never);

    await expect(
      service.createUnsubscription({
        eventId: 'ea2f0d6a-a56d-4bf7-8e4b-7c24d5d2a5bc',
        name: 'Wave Six Member',
        email: 'wavesix.member@example.com',
        comments: 'Empêchement',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
