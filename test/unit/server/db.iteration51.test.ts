import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration51 runDbQuery profile forwarding', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('forwards timeout/retry options for each query profile', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    await setup.module.runDbQuery(async () => 1, 'quick');
    await setup.module.runDbQuery(async () => 2, 'normal');
    await setup.module.runDbQuery(async () => 3, 'complex');
    await setup.module.runDbQuery(async () => 4, 'background');

    expect(setup.executeQueryMock).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      { timeout: 2000, retry: false },
    );
    expect(setup.executeQueryMock).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      { timeout: 5000, retry: true },
    );
    expect(setup.executeQueryMock).toHaveBeenNthCalledWith(
      3,
      expect.any(Function),
      { timeout: 10000, retry: true },
    );
    expect(setup.executeQueryMock).toHaveBeenNthCalledWith(
      4,
      expect.any(Function),
      { timeout: 15000, retry: true },
    );
  });
});

