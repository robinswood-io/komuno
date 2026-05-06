import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';
import { db } from '../../server/db';

vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('EventsService wave30 archimedes', () => {
  it('returns computed stats with rounded averageInscriptions when stats queries succeed', async () => {
    const firstFrom = vi.fn(async () => [
      {
        total: 3,
        upcoming: 2,
        past: 1,
      },
    ]);

    const secondFrom = vi.fn(async () => [
      {
        count: 5,
      },
    ]);

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: firstFrom } as never)
      .mockReturnValueOnce({ from: secondFrom } as never);

    const service = new EventsService({ instance: {} } as never);

    const result = await service.getEventsStats();

    expect(result).toEqual({
      total: 3,
      upcoming: 2,
      past: 1,
      totalInscriptions: 5,
      averageInscriptions: 2,
    });
  });
});
