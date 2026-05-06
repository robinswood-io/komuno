import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave23 archimedes', () => {
  it('throws BadRequestException for invalid createEvent payload before storage call', async () => {
    const createEventMock = vi.fn(async () => ({
      success: true as const,
      data: { id: 'evt-wave23' },
    }));

    const storageService = {
      instance: {
        createEvent: createEventMock,
      },
    };

    const service = new EventsService(storageService as never);

    await expect(service.createEvent({})).rejects.toBeInstanceOf(BadRequestException);
    expect(createEventMock).not.toHaveBeenCalled();
  });
});
