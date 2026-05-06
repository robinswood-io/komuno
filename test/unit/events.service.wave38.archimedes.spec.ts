import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave38 archimedes', () => {
  it('throws BadRequestException for invalid createUnsubscription payload before storage call', async () => {
    const createUnsubscriptionMock = vi.fn(async () => ({
      success: true as const,
      data: { id: 'unsub-wave38' },
    }));

    const storageService = {
      instance: {
        createUnsubscription: createUnsubscriptionMock,
      },
    };

    const service = new EventsService(storageService as never);

    await expect(service.createUnsubscription({})).rejects.toBeInstanceOf(BadRequestException);
    expect(createUnsubscriptionMock).not.toHaveBeenCalled();
  });
});
