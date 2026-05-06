import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration49 pool thresholds around 70%', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('keeps healthy status exactly at 70% utilization', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 14, idleCount: 0, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization).toEqual({ percent: 70, status: 'healthy' });
    expect(stats.warning.breached).toBe(false);
  });
});

