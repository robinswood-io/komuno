import { describe, expect, it, vi } from 'vitest';
import { EventsController } from '../../server/src/events/events.controller';

describe('EventsController wave10 archimedes', () => {
  it('throws default fetch error when getEvents returns success=false without error payload', async () => {
    const getEventsMock = vi.fn(async () => ({
      success: false as const,
    }));

    const controller = new EventsController({ getEvents: getEventsMock } as never);

    await expect(controller.getEvents(undefined, undefined)).rejects.toThrow('Failed to fetch events');
    expect(getEventsMock).toHaveBeenCalledWith(1, 20);
  });
});
