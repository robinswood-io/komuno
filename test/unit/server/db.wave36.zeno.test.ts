import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave36 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('handles idle greater than total by reporting negative active utilization', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      stats: {
        totalCount: 1,
        idleCount: 2,
        waitingCount: 0,
      },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.activeCount).toBe(-1);
    expect(stats.utilization.percent).toBe(-20);
    expect(stats.utilization.status).toBe('healthy');
    expect(stats.warning.breached).toBe(false);
    expect(stats.critical.breached).toBe(false);
  });
});

