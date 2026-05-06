import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave31 archimedes', () => {
  it('forwards default pagination to storage in getEvents', async () => {
    const getEventsMock = vi.fn(async () => ({
      success: true as const,
      data: [{ id: 'evt-wave31' }],
      total: 1,
    }));

    const storageService = {
      instance: {
        getEvents: getEventsMock,
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.getEvents();

    expect(result).toEqual({
      success: true,
      data: [{ id: 'evt-wave31' }],
      total: 1,
    });
    expect(getEventsMock).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });
});
