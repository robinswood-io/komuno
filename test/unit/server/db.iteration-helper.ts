import { createRequire } from 'node:module';
import { vi } from 'vitest';

export type DbJsModule = typeof import('../../../server/db.js');
type EventHandler = (...args: unknown[]) => void;
type PoolStats = { totalCount: number; idleCount: number; waitingCount: number };
type CjsModule = {
  id: string;
  filename: string;
  loaded: boolean;
  children: unknown[];
  paths: string[];
  exports: unknown;
};

export class MockPool {
  public totalCount: number;
  public idleCount: number;
  public waitingCount: number;
  public options: Record<string, unknown>;
  public registeredEvents: string[] = [];
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
    this.registeredEvents.push(event);
    this.handlers.set(event, handler);
    return this;
  }
}

type LoadParams = {
  databaseUrl?: string;
  nodeEnv: string;
  stats?: PoolStats;
  schemaExports?: unknown;
  wsExports?: unknown;
};

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

export function cleanupDbHarness(): void {
  injectedPaths.forEach((modulePath) => {
    delete cjsRequire.cache[modulePath];
  });
  delete process.env.DATABASE_URL;
  delete process.env.NODE_ENV;
}

export function loadDbJsModule(params: LoadParams): {
  module: DbJsModule;
  neonPools: MockPool[];
  pgPools: MockPool[];
  executeQueryMock: ReturnType<typeof vi.fn>;
  drizzleNeonMock: ReturnType<typeof vi.fn>;
  drizzlePgMock: ReturnType<typeof vi.fn>;
  neonConfigRef: Record<string, unknown>;
} {
  cleanupDbHarness();

  if (params.databaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = params.databaseUrl;
  }
  process.env.NODE_ENV = params.nodeEnv;

  const stats = params.stats ?? { totalCount: 0, idleCount: 0, waitingCount: 0 };
  const neonPools: MockPool[] = [];
  const pgPools: MockPool[] = [];

  class NeonPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, stats);
      neonPools.push(this);
    }
  }

  class PgPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, stats);
      pgPools.push(this);
    }
  }

  const executeQueryMock = vi.fn(async <T>(queryFn: () => Promise<T>): Promise<T> => queryFn());

  vi.spyOn(process, 'on').mockImplementation(() => process);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);

  const neonConfigRef: Record<string, unknown> = {};
  const drizzleNeonMock = vi.fn(() => ({ mode: 'neon' }));
  const drizzlePgMock = vi.fn(() => ({ mode: 'pg' }));

  setCjsMock(neonModulePath, { neonConfig: neonConfigRef, Pool: NeonPoolMock });
  setCjsMock(pgModulePath, { Pool: PgPoolMock });
  setCjsMock(drizzleNeonModulePath, { drizzle: drizzleNeonMock });
  setCjsMock(drizzlePgModulePath, { drizzle: drizzlePgMock });
  setCjsMock(wsModulePath, params.wsExports ?? { __esModule: true, default: { kind: 'ws' } });
  setCjsMock(schemaModulePath, params.schemaExports ?? {});
  setCjsMock(loggerModulePath, {
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  });
  setCjsMock(resilienceModulePath, {
    DatabaseResilience: class {
      public executeQuery = executeQueryMock;
    },
  });

  delete cjsRequire.cache[dbModulePath];
  const module = cjsRequire(dbModulePath) as DbJsModule;
  return { module, neonPools, pgPools, executeQueryMock, drizzleNeonMock, drizzlePgMock, neonConfigRef };
}
