import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave34 archimedes', () => {
  it('throws Unknown error message when updateEvent fails without error payload', async () => {
    const storageService = {
      instance: {
        updateEvent: vi.fn(async () => ({
          success: false as const,
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const payload = {
      title: 'Wave34 Event',
      description: 'Description wave34',
      date: '2099-12-31T10:00:00.000Z',
    };

    await expect(service.updateEvent('evt-wave34', payload)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateEvent('evt-wave34', payload)).rejects.toThrow('Unknown error');
  });
});
