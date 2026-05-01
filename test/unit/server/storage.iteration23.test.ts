import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');
type DatabaseStorageCtor = StorageModule['DatabaseStorage'];
type DatabaseStorageInstance = InstanceType<DatabaseStorageCtor>;

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
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
  delete: vi.fn(),
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
      delete: mockDb.delete,
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

describe('server/storage.js - iteration 23 loan item update/delete branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('updateLoanItem returns updated row on success', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: true,
      data: { id: 'loan-23' },
    });

    runDbQueryMock.mockResolvedValueOnce([
      {
        id: 'loan-23',
        title: 'Projecteur pro',
        description: 'Version mise à jour',
        ownerEmail: 'owner@example.com',
        status: 'pending',
      },
    ]);

    const result = await storage.updateLoanItem('loan-23', {
      title: 'Projecteur pro',
      description: 'Version mise à jour',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('loan-23');
      expect(result.data.title).toBe('Projecteur pro');
    }
  });

  it('updateLoanItem returns getLoanItem DatabaseError when read fails', async () => {
    const storage = createStorage();
    runDbQueryMock.mockRejectedValueOnce(new Error('loan read failed'));

    const result = await storage.updateLoanItem('loan-read-fail', {
      title: 'Ignored',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('récupération de la fiche prêt');
    }
  });

  it('updateLoanItem returns NotFoundError when item does not exist', async () => {
    const storage = createStorage();
    runDbQueryMock.mockResolvedValueOnce([]);

    const result = await storage.updateLoanItem('missing-loan', {
      title: 'Nope',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Fiche prêt non trouvée');
    }
  });

  it('updateLoanItem returns DatabaseError when update returns no row', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: true,
      data: { id: 'loan-empty-update' },
    });

    runDbQueryMock.mockResolvedValueOnce([]);

    const result = await storage.updateLoanItem('loan-empty-update', {
      description: 'No returned row',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('mise à jour de la fiche prêt');
    }
  });

  it('updateLoanItem returns DatabaseError when runDbQuery throws', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: true,
      data: { id: 'loan-update-err' },
    });

    runDbQueryMock.mockRejectedValueOnce(new Error('update query failed'));

    const result = await storage.updateLoanItem('loan-update-err', {
      title: 'Failing update',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('mise à jour de la fiche prêt');
    }
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });

  it('deleteLoanItem returns success when delete query succeeds', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: true,
      data: { id: 'loan-delete-ok' },
    });

    runDbQueryMock.mockResolvedValueOnce(undefined);

    const result = await storage.deleteLoanItem('loan-delete-ok');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });

  it('deleteLoanItem returns NotFoundError when item is missing', async () => {
    const storage = createStorage();
    runDbQueryMock.mockResolvedValueOnce([]);

    const result = await storage.deleteLoanItem('loan-delete-missing');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Fiche prêt non trouvée');
    }
  });

  it('deleteLoanItem returns DatabaseError when delete query throws', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: true,
      data: { id: 'loan-delete-err' },
    });

    runDbQueryMock.mockRejectedValueOnce(new Error('delete query failed'));

    const result = await storage.deleteLoanItem('loan-delete-err');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('suppression de la fiche prêt');
    }
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });
});
