import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

type CjsModule = {
  id: string;
  filename: string;
  loaded: boolean;
  children: unknown[];
  paths: string[];
  exports: unknown;
};

type DrizzleArg = { schema?: Record<string, unknown> };
type DrizzleModule = { drizzle: ReturnType<typeof vi.fn<[DrizzleArg], unknown>> };

const cjsRequire = createRequire(import.meta.url);
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const neonModulePath = cjsRequire.resolve('@neondatabase/serverless');
const pgModulePath = cjsRequire.resolve('pg');
const drizzleNeonModulePath = cjsRequire.resolve('drizzle-orm/neon-serverless');
const drizzlePgModulePath = cjsRequire.resolve('drizzle-orm/node-postgres');
const wsModulePath = cjsRequire.resolve('ws');
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const resilienceModulePath = cjsRequire.resolve('../../../server/lib/db-resilience.js');

const injectedPaths = [
  dbModulePath,
  neonModulePath,
  pgModulePath,
  drizzleNeonModulePath,
  drizzlePgModulePath,
  wsModulePath,
  schemaModulePath,
  loggerModulePath,
  resilienceModulePath,
] as const;

function setCjsMock(modulePath: string, moduleExports: unknown): void {
  const previous = cjsRequire.cache[modulePath] as CjsModule | undefined;
  cjsRequire.cache[modulePath] = {
    ...(previous ?? {
      id: modulePath,
      filename: modulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: moduleExports,
  } as CjsModule;
}

function cleanupHarness(): void {
  injectedPaths.forEach((modulePath) => {
    delete cjsRequire.cache[modulePath];
  });
  delete process.env.DATABASE_URL;
  delete process.env.NODE_ENV;
}

describe('server/db.js iteration134 __importStar null schema branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupHarness();
  });

  it('creates namespace object with default:null when schema export is null', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/appdb';
    process.env.NODE_ENV = 'testing';

    class PoolMock {
      public totalCount = 0;
      public idleCount = 0;
      public waitingCount = 0;
      public end = vi.fn(async () => undefined);
      public on(): this {
        return this;
      }
    }

    const drizzlePgMock = vi.fn<[DrizzleArg], unknown>(() => ({ mode: 'pg' }));

    setCjsMock(neonModulePath, { neonConfig: {}, Pool: PoolMock });
    setCjsMock(pgModulePath, { Pool: PoolMock });
    setCjsMock(drizzleNeonModulePath, { drizzle: vi.fn(() => ({ mode: 'neon' })) });
    setCjsMock(drizzlePgModulePath, { drizzle: drizzlePgMock });
    setCjsMock(wsModulePath, { __esModule: true, default: { kind: 'ws' } });
    setCjsMock(schemaModulePath, null);
    setCjsMock(loggerModulePath, { logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } });
    setCjsMock(resilienceModulePath, {
      DatabaseResilience: class {
        public executeQuery = vi.fn(async <T>(queryFn: () => Promise<T>) => queryFn());
      },
    });

    vi.spyOn(process, 'on').mockImplementation(() => process);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    delete cjsRequire.cache[dbModulePath];
    cjsRequire(dbModulePath);

    const drizzlePg = cjsRequire('drizzle-orm/node-postgres') as DrizzleModule;
    const config = drizzlePg.drizzle.mock.calls[0]?.[0];

    expect(config.schema).toEqual({ default: null });
  });
});
