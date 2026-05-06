import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave3 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('keeps warning status at exactly 90% utilization (critical branch not taken)', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: {
        totalCount: 20,
        idleCount: 2,
        waitingCount: 0,
      },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.utilization.percent).toBe(90);
    expect(stats.utilization.status).toBe('warning');
    expect(stats.warning.current).toBe(18);
    expect(stats.warning.threshold).toBe(14);
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.current).toBe(18);
    expect(stats.critical.threshold).toBe(18);
    expect(stats.critical.breached).toBe(false);
  });
});
