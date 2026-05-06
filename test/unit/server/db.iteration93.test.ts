import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration93 warning utilization branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('marks pool as warning when utilization is above 70 and at most 90 percent', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 17, idleCount: 1, waitingCount: 1 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.status).toBe('warning');
    expect(stats.utilization.percent).toBe(80);
  });
});
