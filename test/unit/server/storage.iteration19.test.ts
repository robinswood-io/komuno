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

describe('server/storage.js - iteration 19 loan item branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('createLoanItem returns inserted loan item on success', async () => {
    const storage = createStorage();
    runDbQueryMock.mockResolvedValueOnce([
      {
        id: 'loan-19',
        title: 'Projecteur vidéo',
        description: 'Prêt matériel événement',
        ownerEmail: 'owner@example.com',
        status: 'pending',
      },
    ]);

    const result = await storage.createLoanItem({
      title: 'Projecteur vidéo',
      description: 'Prêt matériel événement',
      ownerEmail: 'owner@example.com',
      status: 'approved',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('loan-19');
      expect(result.data.status).toBe('pending');
    }
  });

  it('createLoanItem returns DatabaseError when runDbQuery throws', async () => {
    const storage = createStorage();
    runDbQueryMock.mockRejectedValueOnce(new Error('insert failed'));

    const result = await storage.createLoanItem({
      title: 'Perceuse',
      description: 'Outillage',
      ownerEmail: 'owner@example.com',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('création de la fiche prêt');
    }
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });

  it('updateLoanItemStatus returns success when update succeeds', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: true,
      data: { id: 'loan-ok' },
    });
    runDbQueryMock.mockResolvedValueOnce(undefined);

    const result = await storage.updateLoanItemStatus(
      'loan-ok',
      'approved',
      'admin@example.com',
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });

  it('updateLoanItemStatus returns DatabaseError when update fails', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: true,
      data: { id: 'loan-ko' },
    });
    runDbQueryMock.mockRejectedValueOnce(new Error('update failed'));

    const result = await storage.updateLoanItemStatus(
      'loan-ko',
      'rejected',
      'admin@example.com',
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('mise à jour du statut');
    }
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });
});
