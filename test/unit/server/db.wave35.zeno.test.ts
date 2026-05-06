import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave35 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('rounds utilization to one decimal when pool counts are fractional', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      stats: {
        totalCount: 4.17,
        idleCount: 0.04,
        waitingCount: 0,
      },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.activeCount).toBeCloseTo(4.13, 6);
    expect(stats.utilization.percent).toBe(82.6);
    expect(stats.utilization.status).toBe('warning');
  });
});

