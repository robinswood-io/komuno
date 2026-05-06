import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration88 getPoolStats warning status branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('sets utilization status to warning above 70 percent and below critical', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 15, idleCount: 0, waitingCount: 2 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.percent).toBe(75);
    expect(stats.utilization.status).toBe('warning');
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(false);
  });
});
