import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration59 critical utilization branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns critical status when utilization is greater than 90%', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 20, idleCount: 0, waitingCount: 4 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.status).toBe('critical');
    expect(stats.critical.breached).toBe(true);
  });
});
