import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave20 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses node-postgres drizzle logger in development and logs query preview', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
    });

    expect(setup.drizzlePgMock).toHaveBeenCalledTimes(1);
    expect(setup.drizzleNeonMock).not.toHaveBeenCalled();

    const drizzleConfig = setup.drizzlePgMock.mock.calls[0]?.[0] as
      | {
          logger: {
            logQuery: (query: string, params: unknown[]) => void;
          };
        }
      | undefined;

    const query = `select ${'a'.repeat(140)}`;
    drizzleConfig?.logger.logQuery(query, []);

    expect(console.log).toHaveBeenCalledWith(`[DB Query] ${query.slice(0, 100)}...`);
  });
});
