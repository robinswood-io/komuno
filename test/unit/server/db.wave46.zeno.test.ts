import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave46 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns complex payload unchanged from runDbQuery quick profile', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });
    const payload = { ok: true, meta: { source: 'wave46' } };

    const result = await setup.module.runDbQuery(async () => payload, 'quick');

    expect(result).toEqual(payload);
    const options = setup.executeQueryMock.mock.calls[0]?.[1] as { timeout: number; retry: boolean } | undefined;
    expect(options).toEqual({ timeout: 2000, retry: false });
  });
});

