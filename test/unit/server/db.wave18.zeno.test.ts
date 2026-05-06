import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave18 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses drizzle neon logger in development and logs truncated query preview', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgres://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'development',
    });

    expect(setup.drizzleNeonMock).toHaveBeenCalledTimes(1);
    expect(setup.drizzlePgMock).not.toHaveBeenCalled();

    const drizzleConfig = setup.drizzleNeonMock.mock.calls[0]?.[0] as
      | {
          logger: {
            logQuery: (query: string, params: unknown[]) => void;
          };
        }
      | undefined;

    const longQuery = `select ${'x'.repeat(150)}`;
    drizzleConfig?.logger.logQuery(longQuery, []);

    expect(console.log).toHaveBeenCalledWith(`[DB Query] ${longQuery.slice(0, 100)}...`);
  });
});
