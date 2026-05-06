import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration106 warning threshold branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('sets warning status when utilization is between 70 and 90 percent', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 16, idleCount: 1, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.status).toBe('warning');
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(false);
  });
});
