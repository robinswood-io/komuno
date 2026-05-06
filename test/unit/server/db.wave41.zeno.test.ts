import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave41 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('reports available connections from production max when pool is lightly used', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: {
        totalCount: 6,
        idleCount: 2,
        waitingCount: 1,
      },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.maxConnections).toBe(20);
    expect(stats.availableConnections).toBe(14);
    expect(stats.availableFromIdle).toBe(2);
    expect(stats.waitingCount).toBe(1);
  });
});

