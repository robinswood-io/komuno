import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave22 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('forwards complex profile and returns resolved payload', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    const payload = { id: 'complex-ok', attempts: 1 };
    const result = await setup.module.runDbQuery(async () => payload, 'complex');

    expect(result).toEqual(payload);
    const options = setup.executeQueryMock.mock.calls[0]?.[1] as { timeout: number; retry: boolean } | undefined;
    expect(options).toEqual({ timeout: 10000, retry: true });
  });
});

