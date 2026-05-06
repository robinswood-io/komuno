import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration89 getPoolStats critical status branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('sets utilization status to critical above 90 percent', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 19, idleCount: 0, waitingCount: 4 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.percent).toBe(95);
    expect(stats.utilization.status).toBe('critical');
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(true);
  });
});
