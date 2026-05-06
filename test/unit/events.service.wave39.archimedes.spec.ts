import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';
import { db } from '../../server/db';

vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('EventsService wave39 archimedes', () => {
  it('returns averageInscriptions=0 when total events is zero', async () => {
    const firstFrom = vi.fn(async () => [
      {
        total: 0,
        upcoming: 0,
        past: 0,
      },
    ]);

    const secondFrom = vi.fn(async () => [
      {
        count: 12,
      },
    ]);

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: firstFrom } as never)
      .mockReturnValueOnce({ from: secondFrom } as never);

    const service = new EventsService({ instance: {} } as never);

    const result = await service.getEventsStats();

    expect(result).toEqual({
      total: 0,
      upcoming: 0,
      past: 0,
      totalInscriptions: 12,
      averageInscriptions: 0,
    });
  });
});
