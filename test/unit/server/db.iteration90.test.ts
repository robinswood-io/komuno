import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration90 getPoolStats healthy status edge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('keeps healthy status exactly at 70 percent utilization', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 14, idleCount: 0, waitingCount: 1 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.percent).toBe(70);
    expect(stats.utilization.status).toBe('healthy');
    expect(stats.warning.breached).toBe(false);
  });
});
