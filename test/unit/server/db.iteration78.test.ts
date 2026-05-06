import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration78 getPoolStats critical threshold edge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('does not breach critical threshold exactly at rounded critical value', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 18, idleCount: 0, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.critical.threshold).toBe(18);
    expect(stats.critical.current).toBe(18);
    expect(stats.critical.breached).toBe(false);
  });
});
