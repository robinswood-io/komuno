import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration67 critical utilization in development pool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns critical when utilization exceeds 90% and critical threshold is breached', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 20, idleCount: 1, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization).toEqual({ percent: 95, status: 'critical' });
    expect(stats.critical.breached).toBe(true);
  });
});
