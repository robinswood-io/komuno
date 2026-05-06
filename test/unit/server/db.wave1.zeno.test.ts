import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave1 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('keeps healthy status when utilization is exactly 70% (warning branch not taken)', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: {
        totalCount: 20,
        idleCount: 6,
        waitingCount: 0,
      },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.utilization.percent).toBe(70);
    expect(stats.utilization.status).toBe('healthy');
    expect(stats.warning.current).toBe(14);
    expect(stats.warning.threshold).toBe(14);
    expect(stats.warning.breached).toBe(false);
    expect(stats.critical.breached).toBe(false);
  });
});
