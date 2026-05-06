import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave32 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('wires neon drizzle client to the created neon pool instance', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgres://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'testing',
    });

    expect(setup.neonPools).toHaveLength(1);
    expect(setup.drizzleNeonMock).toHaveBeenCalledTimes(1);

    const drizzleConfig = setup.drizzleNeonMock.mock.calls[0]?.[0] as
      | { client: unknown; logger: unknown }
      | undefined;

    expect(drizzleConfig?.client).toBe(setup.neonPools[0]);
    expect(drizzleConfig?.logger).toBe(false);
  });
});

