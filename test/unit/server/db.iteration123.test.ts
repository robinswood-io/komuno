import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

type DbJsModule = typeof import('../../../server/db.js');
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

  public emit(event: string, ...args: unknown[]): void {
    const handler = this.handlers.get(event);
    if (handler) handler(...args);
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

function loadDbModule(): { module: DbJsModule; pgPool: MockPool } {
  cleanupHarness();
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/appdb';
  process.env.NODE_ENV = 'development';

  const stats: PoolStats = { totalCount: 5, idleCount: 1, waitingCount: 0 };
  let createdPgPool: MockPool | null = null;

  class NeonPoolMock extends MockPool {}
  class PgPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, stats);
      createdPgPool = this;
    }
  }

  vi.spyOn(process, 'on').mockImplementation(() => process);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);

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
  const module = cjsRequire(dbModulePath) as DbJsModule;
  return { module, pgPool: createdPgPool as MockPool };
}

describe('server/db.js iteration123 standard remove listener callback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupHarness();
  });

  it('logs pool remove event in development on standard provider', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const setup = loadDbModule();

    setup.pgPool.emit('remove');

    expect(consoleLogSpy).toHaveBeenCalledWith('[DB] Connexion fermée (provider: standard, pool: 5)');
  });
});
