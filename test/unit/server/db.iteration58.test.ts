import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration58 healthy utilization branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns healthy status when utilization is at or below 70%', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 10, idleCount: 0, waitingCount: 1 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.status).toBe('healthy');
    expect(stats.warning.breached).toBe(false);
    expect(stats.critical.breached).toBe(false);
  });
});
