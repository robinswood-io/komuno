import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration140 warning utilization branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns warning status when utilization is above 70 and below critical', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 20, idleCount: 5, waitingCount: 1 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.utilization.status).toBe('warning');
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(false);
  });
});
