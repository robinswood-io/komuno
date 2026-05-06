import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration105 critical threshold branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('sets critical status when utilization is above 90 percent', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 20, idleCount: 1, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.status).toBe('critical');
    expect(stats.critical.breached).toBe(true);
  });
});
