import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave25 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses neon production pool sizing and maxUses settings', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgres://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
    });

    const options = setup.neonPools[0].options;
    expect(options.min).toBe(5);
    expect(options.max).toBe(20);
    expect(options.connectionTimeoutMillis).toBe(30000);
    expect(options.idleTimeoutMillis).toBe(600000);
    expect(options.maxUses).toBe(10000);
    expect(options.allowExitOnIdle).toBe(false);
  });
});

