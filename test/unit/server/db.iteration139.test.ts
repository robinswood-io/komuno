import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule, MockPool } from './db.iteration-helper';

type LoggerModule = {
  logger: {
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
};

type DrizzleArg = { logger?: false | { logQuery: (query: string, params: unknown) => void } };
type DrizzleModule = { drizzle: ReturnType<typeof vi.fn<[DrizzleArg], unknown>> };
type PoolInternals = MockPool & {
  handlers: Map<string, (...args: unknown[]) => void>;
};

const cjsRequire = createRequire(import.meta.url);

describe('server/db.js iteration139 standard development callbacks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('executes standard remove/error handlers and drizzle logQuery callback', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      stats: { totalCount: 6, idleCount: 2, waitingCount: 3 },
    });

    const pool = setup.pgPools[0] as PoolInternals;
    pool.handlers.get('remove')?.();
    pool.handlers.get('error')?.(new Error('standard-handler-error'), null);

    const loggerModule = cjsRequire('../../../server/lib/logger.js') as LoggerModule;
    expect(loggerModule.logger.error).toHaveBeenCalledWith(
      'CRITICAL: Database pool error',
      expect.objectContaining({ provider: 'standard', message: 'standard-handler-error' }),
    );

    const pgDrizzle = cjsRequire('drizzle-orm/node-postgres') as DrizzleModule;
    const config = pgDrizzle.drizzle.mock.calls[0]?.[0];
    const logger = config.logger as { logQuery: (query: string, params: unknown) => void };
    logger.logQuery('select id from users', []);
  });
});
