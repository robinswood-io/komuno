import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave41 archimedes', () => {
  it('throws BadRequestException in createEventWithInscriptions when storage returns explicit error', async () => {
    const storageService = {
      instance: {
        createEventWithInscriptions: vi.fn(async () => ({
          success: false as const,
          error: new Error('wave41-storage-error'),
        })),
      },
    };

    const service = new EventsService(storageService as never);

    await expect(
      service.createEventWithInscriptions({
        event: {
          title: 'Wave41 Event',
          description: 'Description wave41',
          date: '2099-12-31T13:00:00.000Z',
        },
        initialInscriptions: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
