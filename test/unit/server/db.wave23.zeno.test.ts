import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave23 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('forwards background profile and propagates query rejection', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    await expect(
      setup.module.runDbQuery(async () => {
        throw new Error('background-failure');
      }, 'background')
    ).rejects.toThrow('background-failure');

    const options = setup.executeQueryMock.mock.calls[0]?.[1] as { timeout: number; retry: boolean } | undefined;
    expect(options).toEqual({ timeout: 15000, retry: true });
  });
});

