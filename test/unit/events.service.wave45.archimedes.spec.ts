import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave45 archimedes', () => {
  it('resolves without throwing in deleteEvent success path', async () => {
    const deleteEventMock = vi.fn(async () => ({
      success: true as const,
    }));

    const storageService = {
      instance: {
        deleteEvent: deleteEventMock,
      },
    };

    const service = new EventsService(storageService as never);

    await expect(service.deleteEvent('evt-wave45')).resolves.toBeUndefined();
    expect(deleteEventMock).toHaveBeenCalledWith('evt-wave45');
  });
});
