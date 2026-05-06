import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave42 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns zero available connections when neon testing pool reaches max', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgres://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'testing',
      stats: {
        totalCount: 2,
        idleCount: 1,
        waitingCount: 1,
      },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.provider).toBe('neon');
    expect(stats.maxConnections).toBe(2);
    expect(stats.availableConnections).toBe(0);
    expect(stats.activeCount).toBe(1);
    expect(stats.utilization.percent).toBe(50);
  });
});

