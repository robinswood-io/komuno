import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration99 runDbQuery complex profile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('forwards complex profile timeout and retry flags', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    await setup.module.runDbQuery(async () => ({ ok: true }), 'complex');

    expect(setup.executeQueryMock).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 10000, retry: true },
    );
  });
});
