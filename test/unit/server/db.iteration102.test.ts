import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration102 NODE_ENV fallback branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses development pool defaults when NODE_ENV is undefined', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: '',
    });

    expect(setup.pgPools[0]?.options).toMatchObject({
      min: 2,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
    });
  });
});
