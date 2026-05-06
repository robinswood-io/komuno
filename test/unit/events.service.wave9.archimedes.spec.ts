import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';
import { db } from '../../server/db';
import { logger } from '../../server/lib/logger';

vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('../../server/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('EventsService wave9 archimedes', () => {
  it('throws BadRequestException when second stats query fails after first succeeds', async () => {
    const firstFrom = vi.fn(async () => [
      {
        total: 2,
        upcoming: 1,
        past: 1,
      },
    ]);

    const secondFrom = vi.fn(async () => {
      throw new Error('wave9-inscriptions-count-failure');
    });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: firstFrom } as never)
      .mockReturnValueOnce({ from: secondFrom } as never);

    const service = new EventsService({ instance: {} } as never);

    await expect(service.getEventsStats()).rejects.toThrow(BadRequestException);
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      'Failed to get events stats',
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});
