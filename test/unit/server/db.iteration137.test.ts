import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration137 testing pool config branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('applies testing min/max and timeouts for standard provider pool', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const pool = setup.pgPools[0];
    expect(pool.options.min).toBe(1);
    expect(pool.options.max).toBe(2);
    expect(pool.options.connectionTimeoutMillis).toBe(5000);
    expect(pool.options.idleTimeoutMillis).toBe(30000);
  });
});
