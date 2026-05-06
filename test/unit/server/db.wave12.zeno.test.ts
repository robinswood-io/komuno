import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave12 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses testing pool sizing for neon provider and only error listener outside development', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgres://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'testing',
      stats: {
        totalCount: 1,
        idleCount: 1,
        waitingCount: 0,
      },
    });

    expect(setup.neonPools).toHaveLength(1);
    expect(setup.pgPools).toHaveLength(0);

    expect(setup.neonPools[0].options.min).toBe(1);
    expect(setup.neonPools[0].options.max).toBe(2);
    expect(setup.neonPools[0].options.connectionTimeoutMillis).toBe(5000);
    expect(setup.neonPools[0].options.idleTimeoutMillis).toBe(30000);
    expect(setup.neonPools[0].options.maxUses).toBe(1000);

    expect(setup.neonPools[0].registeredEvents).toEqual(['error']);
  });
});
