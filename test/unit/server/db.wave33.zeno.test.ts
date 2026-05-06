import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave33 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('forwards the same query function reference to resilience layer', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });
    const queryFn = vi.fn(async () => 7);

    const result = await setup.module.runDbQuery(queryFn, 'quick');

    expect(result).toBe(7);
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(setup.executeQueryMock.mock.calls[0]?.[0]).toBe(queryFn);
  });
});

