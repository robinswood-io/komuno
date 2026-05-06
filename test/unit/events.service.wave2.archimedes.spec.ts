import { describe, expect, it, vi } from 'vitest';
import { EventsController } from '../../server/src/events/events.controller';

describe('EventsController wave2 archimedes', () => {
  it('throws when getEvents service returns success=false branch', async () => {
    const getEventsMock = vi.fn(async () => ({
      success: false as const,
      error: new Error('wave2-events-fetch-failure'),
    }));

    const controller = new EventsController({ getEvents: getEventsMock } as never);

    await expect(controller.getEvents('3', '7')).rejects.toThrow('wave2-events-fetch-failure');
    expect(getEventsMock).toHaveBeenCalledWith(3, 7);
  });
});
