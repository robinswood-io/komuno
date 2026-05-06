import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration77 getPoolStats warning threshold edge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('does not breach warning threshold exactly at rounded threshold value', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 14, idleCount: 0, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.warning.threshold).toBe(14);
    expect(stats.warning.current).toBe(14);
    expect(stats.warning.breached).toBe(false);
  });
});
