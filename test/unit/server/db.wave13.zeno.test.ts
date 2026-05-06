import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave13 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('forwards background timeout profile to resilience layer', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    const result = await setup.module.runDbQuery(async () => 'background-result', 'background');

    expect(result).toBe('background-result');
    expect(setup.executeQueryMock).toHaveBeenCalledTimes(1);

    const firstCall = setup.executeQueryMock.mock.calls[0];
    const options = firstCall?.[1] as { timeout: number; retry: boolean } | undefined;

    expect(options).toEqual({ timeout: 15000, retry: true });
  });
});
