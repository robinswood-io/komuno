import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration92 critical utilization branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('marks pool as critical when utilization is above 90 percent', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 20, idleCount: 1, waitingCount: 2 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.status).toBe('critical');
    expect(stats.utilization.percent).toBe(95);
  });
});
