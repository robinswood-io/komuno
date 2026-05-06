import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave20 archimedes', () => {
  it('throws default BadRequestException message in createInscription when storage fails without error payload', async () => {
    const storageService = {
      instance: {
        createInscription: vi.fn(async () => ({
          success: false as const,
        })),
      },
    };

    const service = new EventsService(storageService as never);

    await expect(
      service.createInscription({
        eventId: '9b4df455-5f87-4185-b589-fbcbd5fd1d0e',
        name: 'Wave Twenty',
        email: 'wave20@example.com',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.createInscription({
        eventId: '9b4df455-5f87-4185-b589-fbcbd5fd1d0e',
        name: 'Wave Twenty',
        email: 'wave20@example.com',
      }),
    ).rejects.toThrow('Unknown error');
  });
});
