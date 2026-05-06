import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

type DrizzleArg = { logger?: false | { logQuery: (query: string, params: unknown) => void } };
type DrizzleModule = { drizzle: ReturnType<typeof vi.fn<[DrizzleArg], unknown>> };

type EventHandler = (...args: unknown[]) => void;
type PoolStats = { totalCount: number; idleCount: number; waitingCount: number };
type CjsModule = { id: string; filename: string; loaded: boolean; children: unknown[]; paths: string[]; exports: unknown };

class MockPool {
  public totalCount: number;
  public idleCount: number;
  public waitingCount: number;
  public options: Record<string, unknown>;
  public end: ReturnType<typeof vi.fn<() => Promise<void>>>;
  private readonly handlers = new Map<string, EventHandler>();

  public constructor(options: Record<string, unknown>, stats: PoolStats) {
    this.options = options;
    this.totalCount = stats.totalCount;
    this.idleCount = stats.idleCount;
    this.waitingCount = stats.waitingCount;
    this.end = vi.fn(async () => undefined);
  }

  public on(event: string, handler: EventHandler): this {
    this.handlers.set(event, handler);
    return this;
  }
}

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

const injectedPaths = [dbModulePath, neonModulePath, pgModulePath, drizzleNeonModulePath, drizzlePgModulePath, wsModulePath, schemaModulePath, loggerModulePath, resilienceModulePath] as const;

function setCjsMock(modulePath: string, moduleExports: unknown): void {
  const previous = cjsRequire.cache[modulePath] as CjsModule | undefined;
  cjsRequire.cache[modulePath] = {
    ...(previous ?? { id: modulePath, filename: modulePath, loaded: true, children: [], paths: [] }),
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

describe('server/db.js iteration128 standard drizzle logger callback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupHarness();
  });

  it('executes standard drizzle logQuery callback and logs query prefix', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/appdb';
    process.env.NODE_ENV = 'development';

    class NeonPoolMock extends MockPool {}
    class PgPoolMock extends MockPool {
      public constructor(options: Record<string, unknown>) {
        super(options, { totalCount: 1, idleCount: 1, waitingCount: 0 });
      }
    }

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(process, 'on').mockImplementation(() => process);

    setCjsMock(neonModulePath, { neonConfig: {}, Pool: NeonPoolMock });
    setCjsMock(pgModulePath, { Pool: PgPoolMock });
    setCjsMock(drizzleNeonModulePath, { drizzle: vi.fn(() => ({ mode: 'neon' })) });
    setCjsMock(drizzlePgModulePath, { drizzle: vi.fn(() => ({ mode: 'pg' })) });
    setCjsMock(wsModulePath, { __esModule: true, default: { kind: 'ws' } });
    setCjsMock(schemaModulePath, {});
    setCjsMock(loggerModulePath, { logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } });
    setCjsMock(resilienceModulePath, {
      DatabaseResilience: class {
        public executeQuery = vi.fn(async <T>(queryFn: () => Promise<T>) => queryFn());
      },
    });

    delete cjsRequire.cache[dbModulePath];
    cjsRequire(dbModulePath);

    const pgDrizzle = cjsRequire('drizzle-orm/node-postgres') as DrizzleModule;
    const arg = pgDrizzle.drizzle.mock.calls[0]?.[0];
    const logger = arg.logger as { logQuery: (query: string, params: unknown) => void };

    logger.logQuery('select * from memberships', []);

    expect(consoleLogSpy).toHaveBeenCalledWith('[DB Query] select * from memberships...');
  });
});
