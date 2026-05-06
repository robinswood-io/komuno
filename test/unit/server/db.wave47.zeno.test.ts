import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave47 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('runs the query function exactly once through background profile', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });
    const queryFn = vi.fn(async () => 'background-once');

    const result = await setup.module.runDbQuery(queryFn, 'background');

    expect(result).toBe('background-once');
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(setup.executeQueryMock).toHaveBeenCalledTimes(1);
  });
});

