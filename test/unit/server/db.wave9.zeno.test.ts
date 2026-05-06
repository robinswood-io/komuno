import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave9 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses normal profile by default when runDbQuery profile is omitted', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
    });

    const output = await setup.module.runDbQuery(async () => ({ ok: true }));

    expect(output).toEqual({ ok: true });
    expect(setup.executeQueryMock).toHaveBeenCalledTimes(1);

    const call = setup.executeQueryMock.mock.calls[0];
    const options = call?.[1] as { timeout: number; retry: boolean } | undefined;

    expect(options).toEqual({ timeout: 5000, retry: true });
  });
});
