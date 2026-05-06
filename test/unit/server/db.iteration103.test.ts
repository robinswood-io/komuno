import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration103 getPoolStats neon branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns neon provider stats using neon pool counters', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 7, idleCount: 2, waitingCount: 3 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.provider).toBe('neon');
    expect(stats.totalCount).toBe(7);
    expect(stats.idleCount).toBe(2);
    expect(stats.waitingCount).toBe(3);
  });
});
