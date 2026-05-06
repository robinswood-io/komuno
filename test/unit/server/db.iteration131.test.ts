import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration131 utilization below warning threshold', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('keeps healthy status when active connections stay below 70 percent', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 10, idleCount: 8, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.utilization.status).toBe('healthy');
    expect(stats.warning.breached).toBe(false);
    expect(stats.critical.breached).toBe(false);
  });
});
