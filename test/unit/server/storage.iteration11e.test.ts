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
          // No-op
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

function mockSelectRows(rows: unknown[]): void {
  mockDb.select.mockImplementation(() => ({
    from: vi.fn(async () => rows),
  }));
}

function mockUpdateReturning(rows: unknown[]): void {
  mockDb.update.mockImplementation(() => ({
    set: vi.fn((_payload: unknown) => ({
      where: vi.fn((_criteria: unknown) => ({
        returning: async () => rows,
      })),
    })),
  }));
}

describe('server/storage.js - iteration 11e members/loans/financial branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getMemberDetails returns NotFoundError when member does not exist', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getMemberByEmail').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.getMemberDetails('missing@komuno.test');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Membre introuvable');
    }
  });

  it('getMemberDetails propagates getMemberActivities error result', async () => {
    const storage = createStorage();
    const upstreamError = new Error('activities query failed');

    vi.spyOn(storage, 'getMemberByEmail').mockResolvedValue({
      success: true,
      data: { email: 'member@komuno.test' },
    });
    vi.spyOn(storage, 'getMemberActivities').mockResolvedValue({
      success: false,
      error: upstreamError,
    });

    const result = await storage.getMemberDetails('member@komuno.test');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(upstreamError);
    }
  });

  it('createLoanItem returns DatabaseError when insert does not return row', async () => {
    const storage = createStorage();
    runDbQueryMock.mockResolvedValueOnce([]);

    const result = await storage.createLoanItem({
      title: 'Perceuse sans fil',
      description: 'Prêt matériel atelier',
      ownerEmail: 'owner@komuno.test',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('création de la fiche prêt');
    }
  });

  it('updateLoanItemStatus propagates getLoanItem failure', async () => {
    const storage = createStorage();
    const upstreamError = new Error('loan lookup failed');

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: false,
      error: upstreamError,
    });

    const result = await storage.updateLoanItemStatus(
      'loan-404',
      'approved',
      'admin@komuno.test',
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(upstreamError);
    }
  });

  it('updateLoanItemStatus returns NotFoundError when item is missing', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.updateLoanItemStatus(
      'loan-missing',
      'rejected',
      'admin@komuno.test',
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Fiche prêt non trouvée');
    }
  });

  it('updateBudget returns NotFoundError when update returns no row', async () => {
    mockSelectRows([
      {
        id: 'budget-1',
        year: 2035,
        period: 'year',
        category: 'event',
        amountInCents: 150000,
      },
    ]);
    mockUpdateReturning([]);

    const storage = createStorage();

    const result = await storage.updateBudget('budget-1', { amountInCents: 175000 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Budget non trouvé');
    }
  });

  it('updateExpense returns NotFoundError when update returns no row', async () => {
    mockSelectRows([
      {
        id: 'expense-1',
        category: 'equipment',
        amountInCents: 9500,
        expenseDate: new Date('2035-01-11T00:00:00.000Z'),
      },
    ]);
    mockUpdateReturning([]);

    const storage = createStorage();

    const result = await storage.updateExpense('expense-1', { amountInCents: 9900 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Dépense non trouvée');
    }
  });
});
