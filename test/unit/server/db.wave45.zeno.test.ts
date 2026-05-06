import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave45 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('rounds utilization to one decimal for neon production pool stats', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgres://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
      stats: {
        totalCount: 11.28,
        idleCount: 0.12,
        waitingCount: 0,
      },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.percent).toBe(55.8);
    expect(stats.utilization.status).toBe('healthy');
  });
});

