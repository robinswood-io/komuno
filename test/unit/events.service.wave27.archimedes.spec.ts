import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave27 archimedes', () => {
  it('returns inscriptions list in getEventInscriptions when storage succeeds', async () => {
    const inscriptionsList = [
      {
        id: 'insc-wave27-1',
        eventId: 'evt-wave27',
        name: 'Wave Twenty Seven',
        email: 'wave27@example.com',
      },
    ];

    const storageService = {
      instance: {
        getEventInscriptions: vi.fn(async () => ({
          success: true as const,
          data: inscriptionsList,
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.getEventInscriptions('evt-wave27');

    expect(result).toEqual(inscriptionsList);
  });
});
