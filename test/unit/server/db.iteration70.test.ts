import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration70 runDbQuery rejection path', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('propagates errors thrown by the query callback', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    await expect(
      setup.module.runDbQuery(async () => {
        throw new Error('query failed');
      }, 'background'),
    ).rejects.toThrow('query failed');
  });
});
