import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration121 neon getPoolStats stats-source branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('reads total/idle/waiting counters from neon pool for getPoolStats', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'testing',
      stats: { totalCount: 2, idleCount: 1, waitingCount: 4 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.provider).toBe('neon');
    expect(stats.totalCount).toBe(2);
    expect(stats.idleCount).toBe(1);
    expect(stats.waitingCount).toBe(4);
  });
});
