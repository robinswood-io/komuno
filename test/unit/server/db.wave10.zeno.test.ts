import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave10 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses complex profile and propagates query rejection', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    await expect(
      setup.module.runDbQuery(async () => {
        throw new Error('complex-query-failed');
      }, 'complex')
    ).rejects.toThrow('complex-query-failed');

    expect(setup.executeQueryMock).toHaveBeenCalledTimes(1);

    const call = setup.executeQueryMock.mock.calls[0];
    const options = call?.[1] as { timeout: number; retry: boolean } | undefined;

    expect(options).toEqual({ timeout: 10000, retry: true });
  });
});
