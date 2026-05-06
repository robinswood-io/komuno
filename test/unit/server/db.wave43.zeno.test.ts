import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave43 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('computes production warning threshold from max pool size', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: {
        totalCount: 14,
        idleCount: 0,
        waitingCount: 0,
      },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.warning.threshold).toBe(14);
    expect(stats.warning.current).toBe(14);
    expect(stats.warning.breached).toBe(false);
  });
});

