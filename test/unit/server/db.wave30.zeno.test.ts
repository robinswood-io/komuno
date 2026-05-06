import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave30 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('computes development thresholds using rounded max ratios', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      stats: {
        totalCount: 5,
        idleCount: 1,
        waitingCount: 2,
      },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.maxConnections).toBe(5);
    expect(stats.warning.threshold).toBe(4);
    expect(stats.critical.threshold).toBe(5);
    expect(stats.warning.current).toBe(4);
    expect(stats.warning.breached).toBe(false);
    expect(stats.critical.breached).toBe(false);
    expect(stats.waitingCount).toBe(2);
    expect(stats.utilization.status).toBe('warning');
  });
});
