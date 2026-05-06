import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration79 runDbQuery propagates primitive return', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns primitive values from query callback', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    await expect(setup.module.runDbQuery(async () => 42, 'quick')).resolves.toBe(42);
  });
});
