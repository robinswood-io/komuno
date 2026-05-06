import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave11 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('registers development listeners for standard provider', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      stats: {
        totalCount: 2,
        idleCount: 1,
        waitingCount: 0,
      },
    });

    expect(setup.pgPools).toHaveLength(1);
    expect(setup.neonPools).toHaveLength(0);
    expect(setup.pgPools[0].registeredEvents).toEqual(['connect', 'remove', 'error']);
  });
});
