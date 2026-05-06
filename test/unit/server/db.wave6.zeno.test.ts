import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave6 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('falls back to development pool config when NODE_ENV is empty', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: '',
      stats: {
        totalCount: 3,
        idleCount: 1,
        waitingCount: 0,
      },
    });

    expect(setup.pgPools[0].options.min).toBe(2);
    expect(setup.pgPools[0].options.max).toBe(5);

    const stats = setup.module.getPoolStats();
    expect(stats.minConnections).toBe(2);
    expect(stats.maxConnections).toBe(5);
    expect(stats.activeCount).toBe(2);
    expect(stats.utilization.percent).toBe(40);
    expect(stats.utilization.status).toBe('healthy');
  });
});
