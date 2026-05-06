import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave44 archimedes', () => {
  it('returns updated event data in updateEvent success path', async () => {
    const storageService = {
      instance: {
        updateEvent: vi.fn(async () => ({
          success: true as const,
          data: {
            id: 'evt-wave44',
            title: 'Wave44 Updated Event',
            description: 'Updated description wave44',
            date: '2099-12-31T16:00:00.000Z',
          },
        })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.updateEvent('evt-wave44', {
      title: 'Wave44 Updated Event',
      description: 'Updated description wave44',
      date: '2099-12-31T16:00:00.000Z',
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'evt-wave44',
        title: 'Wave44 Updated Event',
      }),
    );
  });
});
