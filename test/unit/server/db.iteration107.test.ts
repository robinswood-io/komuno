import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration107 healthy threshold branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('keeps healthy status when utilization is exactly 70 percent', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 14, idleCount: 0, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.status).toBe('healthy');
    expect(stats.warning.breached).toBe(false);
  });
});
