import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration100 runDbQuery normal profile explicit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('forwards normal profile timeout and retry flags', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    await setup.module.runDbQuery(async () => ({ ok: 1 }), 'normal');

    expect(setup.executeQueryMock).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 5000, retry: true },
    );
  });
});
