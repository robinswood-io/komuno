import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave17 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses drizzle node-postgres with logger disabled in production standard provider', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    expect(setup.pgPools).toHaveLength(1);
    expect(setup.neonPools).toHaveLength(0);

    expect(setup.drizzlePgMock).toHaveBeenCalledTimes(1);
    expect(setup.drizzleNeonMock).not.toHaveBeenCalled();

    const drizzleConfig = setup.drizzlePgMock.mock.calls[0]?.[0] as
      | { client: unknown; schema: unknown; logger: unknown }
      | undefined;

    expect(drizzleConfig?.client).toBe(setup.pgPools[0]);
    expect(drizzleConfig?.logger).toBe(false);
  });
});
