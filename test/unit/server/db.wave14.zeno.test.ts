import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave14 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('reports negative available capacity and critical thresholds when pool exceeds max', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: {
        totalCount: 25,
        idleCount: 0,
        waitingCount: 4,
      },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.maxConnections).toBe(20);
    expect(stats.activeCount).toBe(25);
    expect(stats.availableConnections).toBe(-5);
    expect(stats.availableFromIdle).toBe(0);
    expect(stats.utilization.status).toBe('critical');
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(true);
  });
});
