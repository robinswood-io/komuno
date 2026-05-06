import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave19 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns neon provider stats with waiting count and available capacity from testing config', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgres://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'testing',
      stats: {
        totalCount: 1,
        idleCount: 1,
        waitingCount: 3,
      },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.provider).toBe('neon');
    expect(stats.maxConnections).toBe(2);
    expect(stats.totalCount).toBe(1);
    expect(stats.waitingCount).toBe(3);
    expect(stats.availableConnections).toBe(1);
    expect(stats.availableFromIdle).toBe(1);
    expect(stats.utilization.status).toBe('healthy');
  });
});
