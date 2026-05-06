import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration145 targeted uncovered branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('throws explicit error when DATABASE_URL is missing', () => {
    expect(() => loadDbJsModule({ databaseUrl: undefined, nodeEnv: 'testing' })).toThrow(
      'DATABASE_URL must be set. Did you forget to provision a database?',
    );
  });

  it('applies neon runtime config and development logger path', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@ep-cool-neon.neon.tech/db',
      nodeEnv: 'development',
      stats: { totalCount: 8, idleCount: 2, waitingCount: 1 },
    });

    expect(setup.neonConfigRef.webSocketConstructor).toBeDefined();
    expect(setup.neonConfigRef.poolQueryViaFetch).toBe(true);
    const fetchEndpoint = setup.neonConfigRef.fetchEndpoint as ((host: string) => string) | undefined;
    expect(fetchEndpoint?.('api.neon.tech')).toBe('https://api.neon.tech/sql');

    const drizzleConfig = setup.drizzleNeonMock.mock.calls[0]?.[0] as
      | { logger: false | { logQuery: (query: string, params: unknown[]) => void } }
      | undefined;
    expect(drizzleConfig).toBeDefined();
    if (drizzleConfig && drizzleConfig.logger && drizzleConfig.logger !== false) {
      drizzleConfig.logger.logQuery('SELECT * FROM very_long_table_name_that_will_be_sliced_1234567890', []);
    }

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DB Query] SELECT * FROM very_long_table_name_that_will_be_sliced_1234567890'));
  });

  it('uses production pool sizing for standard provider and marks warning utilization', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 15, idleCount: 0, waitingCount: 0 },
    });

    const options = setup.pgPools[0]?.options as
      | { max?: number; min?: number; connectionTimeoutMillis?: number; idleTimeoutMillis?: number }
      | undefined;
    expect(options?.max).toBe(20);
    expect(options?.min).toBe(5);
    expect(options?.connectionTimeoutMillis).toBe(30000);
    expect(options?.idleTimeoutMillis).toBe(600000);

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.status).toBe('warning');
    expect(stats.utilization.percent).toBe(75);
  });

  it('runDbQuery forwards selected profile timeout and retry options', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const queryFn = vi.fn(async () => 'ok');
    const result = await setup.module.runDbQuery(queryFn, 'quick');

    expect(result).toBe('ok');
    expect(setup.executeQueryMock).toHaveBeenCalledWith(queryFn, { timeout: 2000, retry: false });
  });

  it('closePool logs both start and success messages on SIGTERM', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const processOnMock = vi.mocked(process.on);
    const sigtermHandler = processOnMock.mock.calls.find(([eventName]) => eventName === 'SIGTERM')?.[1] as
      | (() => Promise<void>)
      | undefined;

    expect(sigtermHandler).toBeDefined();
    await sigtermHandler?.();

    expect(consoleLogSpy).toHaveBeenCalledWith('[DB] Fermeture gracieuse du pool de connexions...');
    expect(consoleLogSpy).toHaveBeenCalledWith('[DB] Pool fermé');
  });
});
