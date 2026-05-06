import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule, MockPool } from './db.iteration-helper';

type NeonConfigShape = {
  webSocketConstructor?: unknown;
  poolQueryViaFetch?: boolean;
  fetchEndpoint?: (host: string) => string;
};

type NeonModuleShape = { neonConfig: NeonConfigShape };
type DrizzleArg = { logger?: false | { logQuery: (query: string, params: unknown) => void } };
type DrizzleModule = { drizzle: ReturnType<typeof vi.fn<[DrizzleArg], unknown>> };

type PoolInternals = MockPool & {
  handlers: Map<string, (...args: unknown[]) => void>;
};

const cjsRequire = createRequire(import.meta.url);

describe('server/db.js iteration135 neon provider config + callbacks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('sets neonConfig and executes neon error/logQuery callbacks in development', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'development',
      stats: { totalCount: 7, idleCount: 2, waitingCount: 1 },
      wsExports: { __esModule: true, default: { kind: 'ws-constructor' } },
    });

    const neonModule = cjsRequire('@neondatabase/serverless') as NeonModuleShape;

    expect(neonModule.neonConfig.poolQueryViaFetch).toBe(true);
    expect(neonModule.neonConfig.webSocketConstructor).toEqual({ kind: 'ws-constructor' });
    expect(neonModule.neonConfig.fetchEndpoint?.('db.host')).toBe('https://db.host/sql');

    const pool = setup.neonPools[0] as PoolInternals;
    pool.handlers.get('connect')?.();
    pool.handlers.get('remove')?.();
    pool.handlers.get('error')?.(new Error('neon-handler-error'), null);

    const neonDrizzle = cjsRequire('drizzle-orm/neon-serverless') as DrizzleModule;
    const config = neonDrizzle.drizzle.mock.calls[0]?.[0];
    const logger = config.logger as { logQuery: (query: string, params: unknown) => void };
    logger.logQuery('select id from committees', []);
  });
});
