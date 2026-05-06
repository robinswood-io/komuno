import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration68 available connections metrics', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('computes available connections fields from pool config and runtime stats', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      stats: { totalCount: 1, idleCount: 1, waitingCount: 2 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.minConnections).toBe(1);
    expect(stats.maxConnections).toBe(2);
    expect(stats.availableConnections).toBe(1);
    expect(stats.availableFromIdle).toBe(1);
    expect(stats.waitingCount).toBe(2);
  });
});
