import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration119 neon warning utilization branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns warning utilization status for neon between 70 and 90 percent', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 18, idleCount: 2, waitingCount: 1 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.provider).toBe('neon');
    expect(stats.utilization.status).toBe('warning');
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(false);
  });
});
