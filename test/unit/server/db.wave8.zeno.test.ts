import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave8 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses quick timeout profile when runDbQuery is called with quick', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const output = await setup.module.runDbQuery(async () => 'quick-result', 'quick');

    expect(output).toBe('quick-result');
    expect(setup.executeQueryMock).toHaveBeenCalledTimes(1);

    const call = setup.executeQueryMock.mock.calls[0];
    const options = call?.[1] as { timeout: number; retry: boolean } | undefined;

    expect(options).toEqual({ timeout: 2000, retry: false });
  });
});
