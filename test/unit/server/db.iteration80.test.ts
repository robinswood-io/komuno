import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration80 runDbQuery default profile on neon', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses normal profile defaults for neon provider when profile omitted', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
    });

    await setup.module.runDbQuery(async () => 'neon-default');

    expect(setup.executeQueryMock).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 5000, retry: true },
    );
  });
});
