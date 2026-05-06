import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration136 production pool config branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('applies production min/max and timeouts for standard provider pool', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    const pool = setup.pgPools[0];
    expect(pool.options.min).toBe(5);
    expect(pool.options.max).toBe(20);
    expect(pool.options.connectionTimeoutMillis).toBe(30000);
    expect(pool.options.idleTimeoutMillis).toBe(600000);
  });
});
