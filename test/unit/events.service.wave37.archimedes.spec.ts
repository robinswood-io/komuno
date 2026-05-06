import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave37 archimedes', () => {
  it('throws BadRequestException for invalid createInscription payload before storage call', async () => {
    const createInscriptionMock = vi.fn(async () => ({
      success: true as const,
      data: { id: 'insc-wave37' },
    }));

    const storageService = {
      instance: {
        createInscription: createInscriptionMock,
      },
    };

    const service = new EventsService(storageService as never);

    await expect(service.createInscription({})).rejects.toBeInstanceOf(BadRequestException);
    expect(createInscriptionMock).not.toHaveBeenCalled();
  });
});
