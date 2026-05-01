import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

type LoggerMock = {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
};

type SessionStoreConfig = {
  pool: unknown;
  createTableIfMissing: boolean;
  tableName: string;
  pruneSessionInterval: number;
  errorLog: (error: unknown) => void;
  schemaName: string;
  ttl: number;
};

type CjsCacheModule = {
  id: string;
  filename: string;
  loaded: boolean;
  children: unknown[];
  paths: string[];
  exports: unknown;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const injectedPaths = [
  storageModulePath,
  dbModulePath,
  loggerModulePath,
  expressSessionModulePath,
  connectPgSimpleModulePath,
] as const;

const mockDb: DbMock = {
  select: vi.fn(),
  insert: vi.fn(),
};

const loggerMock: LoggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

let capturedSessionStoreConfig: SessionStoreConfig | null = null;

function setCjsModule(path: string, exportsValue: unknown): void {
  const previous = cjsRequire.cache[path] as CjsCacheModule | undefined;
  cjsRequire.cache[path] = {
    ...(previous ?? {
      id: path,
      filename: path,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: exportsValue,
  } as CjsCacheModule;
}

function setupStorageDependencies(): void {
  setCjsModule(dbModulePath, {
    pool: { id: 'mock-pool' },
    dbResilience: {},
    QUERY_TIMEOUT_PROFILES: {},
    runDbQuery: vi.fn(),
    getPoolStats: vi.fn(),
    db: {
      select: mockDb.select,
      insert: mockDb.insert,
    },
  });

  setCjsModule(loggerModulePath, { logger: loggerMock });

  setCjsModule(expressSessionModulePath, function mockExpressSession() {
    return {};
  });

  setCjsModule(
    connectPgSimpleModulePath,
    () =>
      class MockPostgresSessionStore {
        public constructor(config: SessionStoreConfig) {
          capturedSessionStoreConfig = config;
        }
      },
  );
}

function createStorage(): InstanceType<StorageModule['DatabaseStorage']> {
  delete cjsRequire.cache[storageModulePath];
  const storageModule = cjsRequire(storageModulePath) as StorageModule;
  return new storageModule.DatabaseStorage();
}

describe('server/storage.js - iteration 28 admin/runtime branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSessionStoreConfig = null;
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('configures PostgresSessionStore and forwards errorLog to logger.error', () => {
    createStorage();

    expect(capturedSessionStoreConfig).not.toBeNull();
    expect(capturedSessionStoreConfig?.tableName).toBe('user_sessions');
    expect(capturedSessionStoreConfig?.createTableIfMissing).toBe(false);
    expect(capturedSessionStoreConfig?.schemaName).toBe('public');
    expect(capturedSessionStoreConfig?.ttl).toBe(24 * 60 * 60);

    const storeError = new Error('session-store-failure');
    capturedSessionStoreConfig?.errorLog(storeError);

    expect(loggerMock.error).toHaveBeenCalledWith('Session store error', { error: storeError });
  });

  it('getAllAdmins returns DatabaseError when orderBy chain throws', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementation(() => ({
      from: () => ({
        orderBy: async () => {
          throw new Error('orderBy failed');
        },
      }),
    }));

    const result = await storage.getAllAdmins();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('récupération des administrateurs');
    }
  });

  it('getPendingAdmins returns pending admins list on success path', async () => {
    const storage = createStorage();
    const rows = [
      { id: 'admin-1', email: 'pending1@example.com', status: 'pending' },
      { id: 'admin-2', email: 'pending2@example.com', status: 'pending' },
    ];

    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          orderBy: async () => rows,
        }),
      }),
    }));

    const result = await storage.getPendingAdmins();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(rows);
    }
  });

  it('createUser proceeds to insert when getUser fails internally and returns success', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: async () => {
          throw new Error('select failed');
        },
      }),
    }));

    const insertedUser = {
      id: 'admin-100',
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'Admin',
      role: 'ideas_reader',
      status: 'pending',
      isActive: false,
    };

    mockDb.insert.mockImplementation(() => ({
      values: () => ({
        returning: async () => [insertedUser],
      }),
    }));

    const result = await storage.createUser({
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'Admin',
      password: 'hashed-password',
      role: 'ideas_reader',
      status: 'pending',
      isActive: false,
    });

    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(insertedUser);
    }
  });
});
