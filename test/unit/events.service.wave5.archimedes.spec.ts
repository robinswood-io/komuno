import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave5 archimedes', () => {
  it('throws NotFoundException in updateEvent when storage returns NotFoundError', async () => {
    const missingEventError = new Error('event-not-found-wave5');
    Object.defineProperty(missingEventError, 'name', { value: 'NotFoundError' });

    const storageService = {
      instance: {
        updateEvent: vi.fn(async () => ({
          success: false as const,
          error: missingEventError,
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const validUpdatePayload = {
      title: 'Mise a jour Event Wave5',
      description: 'Description valide',
      date: '2099-07-10T19:30:00.000Z',
      location: 'Amiens',
      maxParticipants: 80,
    };

    await expect(service.updateEvent('9f48d72a-a719-44d1-bfd9-7375f8f80f2b', validUpdatePayload)).rejects.toThrow(NotFoundException);
  });
});
