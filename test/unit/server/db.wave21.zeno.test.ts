import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave21 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('forwards explicit normal profile to resilience layer', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
    });

    const result = await setup.module.runDbQuery(async () => 'normal-profile', 'normal');

    expect(result).toBe('normal-profile');
    const options = setup.executeQueryMock.mock.calls[0]?.[1] as { timeout: number; retry: boolean } | undefined;
    expect(options).toEqual({ timeout: 5000, retry: true });
  });
});
