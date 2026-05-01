import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');
type DatabaseStorageCtor = StorageModule['DatabaseStorage'];
type DatabaseStorageInstance = InstanceType<DatabaseStorageCtor>;

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  select: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
};

const runDbQueryMock = vi.fn();

const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

function setCjsModule(path: string, exportsValue: unknown): void {
  const previous = cjsRequire.cache[path];
  cjsRequire.cache[path] = {
    ...(previous ?? {
      id: path,
      filename: path,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: exportsValue,
  };
}

function setupStorageDependencies(): void {
  setCjsModule(dbModulePath, {
    pool: {},
    dbResilience: {},
    QUERY_TIMEOUT_PROFILES: {},
    runDbQuery: runDbQueryMock,
    getPoolStats: vi.fn(),
    db: {
      select: mockDb.select,
      update: mockDb.update,
      transaction: mockDb.transaction,
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
        constructor(_config: unknown) {
          // no-op
        }
      },
  );
}

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

function createStorage(): DatabaseStorageInstance {
  const { DatabaseStorage } = loadStorageModule();
  return new DatabaseStorage();
}

function createSelectBuilder(): {
  from: () => {
    where: (_clause: unknown) => unknown;
    orderBy: (_clause: unknown) => unknown;
  };
} {
  const chain = {
    where: (_clause: unknown) => chain,
    orderBy: (_clause: unknown) => chain,
    limit: (_value: number) => chain,
    offset: (_value: number) => chain,
  };

  return {
    from: () => chain,
  };
}

describe('server/storage.js - iteration 20 getAllLoanItems coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
    mockDb.select.mockImplementation(() => createSelectBuilder());
  });

  it('getAllLoanItems returns normalized payload on success', async () => {
    const storage = createStorage();

    runDbQueryMock
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce({ unexpected: true });

    const result = await storage.getAllLoanItems({ page: 2, limit: 15, search: 'projecteur' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(3);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(15);
      expect(result.data.data).toEqual([]);
    }
    expect(runDbQueryMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('getAllLoanItems returns empty success when relation does not exist', async () => {
    const storage = createStorage();

    runDbQueryMock.mockRejectedValueOnce(new Error('relation "loan_items" does not exist'));

    const result = await storage.getAllLoanItems({ page: 3, limit: 7 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data).toEqual([]);
      expect(result.data.total).toBe(0);
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(7);
    }
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Loan items table does not exist yet, returning empty list',
      expect.objectContaining({ error: expect.stringContaining('loan_items') }),
    );
  });

  it('getAllLoanItems returns DatabaseError on generic failure', async () => {
    const storage = createStorage();

    runDbQueryMock.mockRejectedValueOnce(new Error('query timeout'));

    const result = await storage.getAllLoanItems({ page: 1, limit: 20, search: 'x' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('récupération des fiches prêt');
    }
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });
});
