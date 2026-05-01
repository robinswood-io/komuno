import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type DbJsModule = typeof import('../../../server/db.js');

type EventHandler = (...args: unknown[]) => void;

type PoolStats = {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
};

type CjsModule = {
  id: string;
  filename: string;
  loaded: boolean;
  children: unknown[];
  paths: string[];
  exports: unknown;
};

type DrizzleLogger = {
  logQuery: (query: string, params: unknown) => void;
};

type DrizzleConfig = {
  client: unknown;
  schema: Record<string, unknown>;
  logger: DrizzleLogger | false;
};

class MockPool {
  public totalCount: number;
  public idleCount: number;
  public waitingCount: number;

  public constructor(_options: Record<string, unknown>, stats: PoolStats) {
    this.totalCount = stats.totalCount;
    this.idleCount = stats.idleCount;
    this.waitingCount = stats.waitingCount;
  }

  public on(_event: string, _handler: EventHandler): this {
    return this;
  }

  public end = vi.fn(async () => undefined);
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

type LoadResult = {
  module: DbJsModule;
  drizzlePgMock: ReturnType<typeof vi.fn<(cfg: DrizzleConfig) => { mode: string }>>;
};

function loadDbJsModule(params: {
  databaseUrl: string;
  nodeEnv: 'development' | 'testing' | 'production';
  schemaExports: Record<string, unknown>;
  wsExports: unknown;
  forceObjectCreateFallback: boolean;
}): LoadResult {
  process.env.DATABASE_URL = params.databaseUrl;
  process.env.NODE_ENV = params.nodeEnv;

  const drizzlePgMock = vi.fn<(cfg: DrizzleConfig) => { mode: string }>(() => ({ mode: 'pg' }));

  vi.spyOn(process, 'on').mockImplementation(() => process);

  setCjsMock(neonModulePath, {
    neonConfig: {},
    Pool: class extends MockPool {
      public constructor(options: Record<string, unknown>) {
        super(options, { totalCount: 0, idleCount: 0, waitingCount: 0 });
      }
    },
  });

  setCjsMock(pgModulePath, {
    Pool: class extends MockPool {
      public constructor(options: Record<string, unknown>) {
        super(options, { totalCount: 0, idleCount: 0, waitingCount: 0 });
      }
    },
  });

  setCjsMock(drizzleNeonModulePath, { drizzle: vi.fn(() => ({ mode: 'neon' })) });
  setCjsMock(drizzlePgModulePath, { drizzle: drizzlePgMock });
  setCjsMock(wsModulePath, params.wsExports);
  setCjsMock(schemaModulePath, params.schemaExports);
  setCjsMock(loggerModulePath, {
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  });
  setCjsMock(resilienceModulePath, {
    DatabaseResilience: class {
      public executeQuery = vi.fn(async <T>(queryFn: () => Promise<T>) => queryFn());
    },
  });

  delete cjsRequire.cache[dbModulePath];

  type MutableObjectConstructor = {
    create: ObjectConstructor['create'] | undefined;
  };

  const objectCtor = Object as unknown as MutableObjectConstructor;
  const previousCreate = objectCtor.create;

  if (params.forceObjectCreateFallback) {
    objectCtor.create = undefined;
  }

  try {
    const module = cjsRequire(dbModulePath) as DbJsModule;
    return { module, drizzlePgMock };
  } finally {
    objectCtor.create = previousCreate;
  }
}

describe('server/db.js iteration30a CJS helper fallback coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    injectedPaths.forEach((modulePath) => {
      delete cjsRequire.cache[modulePath];
    });
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('covers __createBinding/__setModuleDefault fallback branches when Object.create is unavailable', () => {
    const schemaExports = {
      users: { tableName: 'users' },
      settings: { tableName: 'settings' },
    };

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      schemaExports,
      wsExports: { __esModule: true, default: { kind: 'ws-constructor' } },
      forceObjectCreateFallback: true,
    });

    const drizzleConfig = setup.drizzlePgMock.mock.calls[0]?.[0];
    expect(drizzleConfig).toBeDefined();

    expect(drizzleConfig?.schema).toMatchObject({
      users: { tableName: 'users' },
      settings: { tableName: 'settings' },
    });

    expect(drizzleConfig?.schema.default).toEqual(schemaExports);
  });

  it('covers __importStar early-return branch when schema module is already __esModule', () => {
    const esModuleSchema = {
      __esModule: true,
      users: { tableName: 'users' },
    };

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      schemaExports: esModuleSchema,
      wsExports: { __esModule: true, default: { kind: 'ws-constructor' } },
      forceObjectCreateFallback: false,
    });

    const drizzleConfig = setup.drizzlePgMock.mock.calls[0]?.[0];
    expect(drizzleConfig).toBeDefined();

    expect(drizzleConfig?.schema).toBe(esModuleSchema);
    expect(drizzleConfig?.schema).not.toHaveProperty('default');
  });

  it('covers __createBinding descriptor rewrite path with Object.create available', () => {
    const schemaExports = {
      users: { tableName: 'users' },
    };

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      schemaExports,
      wsExports: { __esModule: true, default: { kind: 'ws-constructor' } },
      forceObjectCreateFallback: false,
    });

    const drizzleConfig = setup.drizzlePgMock.mock.calls[0]?.[0];
    expect(drizzleConfig).toBeDefined();

    const usersDescriptor = drizzleConfig
      ? Object.getOwnPropertyDescriptor(drizzleConfig.schema, 'users')
      : undefined;

    expect(usersDescriptor).toBeDefined();
    expect(typeof usersDescriptor?.get).toBe('function');
    expect(usersDescriptor?.enumerable).toBe(true);

    const usersValue = drizzleConfig?.schema.users;
    expect(usersValue).toEqual({ tableName: 'users' });
  });
});
