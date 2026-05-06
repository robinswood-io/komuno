import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave34 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses normal profile when runDbQuery receives explicit undefined profile', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
    });

    const value = await setup.module.runDbQuery(async () => 'explicit-undefined', undefined);

    expect(value).toBe('explicit-undefined');
    const options = setup.executeQueryMock.mock.calls[0]?.[1] as { timeout: number; retry: boolean } | undefined;
    expect(options).toEqual({ timeout: 5000, retry: true });
  });
});

