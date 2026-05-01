import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

type LoggerMock = {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
};

type CjsCacheModule = {
  id: string;
  filename: string;
  loaded: boolean;
  children: unknown[];
  paths: string[];
  exports: unknown;
};

type LoanItemRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
};

type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => string;

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const drizzleOrmModulePath = cjsRequire.resolve('drizzle-orm');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');
const actualDrizzleOrm = cjsRequire('drizzle-orm') as Record<string, unknown>;

const mockDb: DbMock = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const loggerMock: LoggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

const runDbQueryMock = vi.fn();
const eqMock = vi.fn((left: unknown, right: unknown) => ({ op: 'eq', left, right }));
const neMock = vi.fn((left: unknown, right: unknown) => ({ op: 'ne', left, right }));
const andMock = vi.fn((...conditions: unknown[]) => ({ op: 'and', conditions }));
const orMock = vi.fn((...conditions: unknown[]) => ({ op: 'or', conditions }));
const descMock = vi.fn((column: unknown) => ({ op: 'desc', column }));
const countMock = vi.fn(() => ({ op: 'count' }));
const sqlMock = vi.fn<SqlTag>((strings, ...values) =>
  strings.reduce((acc, part, index) => `${acc}${part}${index < values.length ? String(values[index]) : ''}`, ''),
);

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
    pool: {},
    dbResilience: {},
    QUERY_TIMEOUT_PROFILES: {},
    runDbQuery: runDbQueryMock,
    getPoolStats: vi.fn(),
    db: {
      select: mockDb.select,
      insert: mockDb.insert,
      update: mockDb.update,
      delete: mockDb.delete,
    },
  });

  setCjsModule(loggerModulePath, {
    logger: loggerMock,
  });

  setCjsModule(drizzleOrmModulePath, {
    ...actualDrizzleOrm,
    eq: eqMock,
    ne: neMock,
    and: andMock,
    or: orMock,
    desc: descMock,
    count: countMock,
    sql: sqlMock,
  });

  setCjsModule(expressSessionModulePath, function mockExpressSession() {
    return {};
  });

  setCjsModule(
    connectPgSimpleModulePath,
    () =>
      class MockPostgresSessionStore {
        public constructor(_config: unknown) {
          // no-op
        }
      },
  );
}

function createStorage(): InstanceType<StorageModule['DatabaseStorage']> {
  delete cjsRequire.cache[storageModulePath];
  const storageModule = cjsRequire(storageModulePath) as StorageModule;
  return new storageModule.DatabaseStorage();
}

describe('server/storage.js - iteration31 getLoanItems uncovered branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('returns paginated loan items with explicit status and escaped search term', async () => {
    const storage = createStorage();

    const rows: LoanItemRow[] = [
      {
        id: 'loan-1',
        title: 'Caméra',
        description: 'Caméra 4K',
        status: 'approved',
        createdAt: new Date('2026-01-10T12:00:00.000Z'),
      },
    ];

    mockDb.select.mockImplementation((selection?: unknown) => {
      if (selection && typeof selection === 'object') {
        return {
          from: (_table: unknown) => ({
            where: async (_whereClause: unknown) => [{ count: 7 }],
          }),
        };
      }

      return {
        from: (_table: unknown) => ({
          where: (_whereClause: unknown) => ({
            orderBy: (_order: unknown) => ({
              limit: (_limit: number) => ({
                offset: async (_offset: number) => rows,
              }),
            }),
          }),
        }),
      };
    });

    runDbQueryMock.mockImplementation(async (queryFn: () => Promise<unknown>, _profile: string) => queryFn());

    const result = await storage.getLoanItems({
      page: 2,
      limit: 5,
      status: 'approved',
      search: 'cam%_test',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(7);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(5);
      expect(result.data.data).toEqual(rows);
    }

    expect(eqMock).toHaveBeenCalled();
    expect(orMock).toHaveBeenCalled();
    expect(sqlMock).toHaveBeenCalled();
    const profiles = runDbQueryMock.mock.calls.map((call) => call[1]);
    expect(profiles).toContain('quick');
    expect(profiles).toContain('normal');
  });

  it('falls back to empty array when item query does not return an array and uses default paging', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementation((selection?: unknown) => {
      if (selection && typeof selection === 'object') {
        return {
          from: (_table: unknown) => ({
            where: async (_whereClause: unknown) => [{ count: 0 }],
          }),
        };
      }

      return {
        from: (_table: unknown) => ({
          where: (_whereClause: unknown) => ({
            orderBy: (_order: unknown) => ({
              limit: (_limit: number) => ({
                offset: async (_offset: number) => ({ unexpected: true }),
              }),
            }),
          }),
        }),
      };
    });

    runDbQueryMock.mockImplementation(async (queryFn: () => Promise<unknown>, _profile: string) => queryFn());

    const result = await storage.getLoanItems();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(0);
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.data).toEqual([]);
    }

    expect(neMock).toHaveBeenCalled();
  });

  it('returns empty success payload and warning log when loan table is missing', async () => {
    const storage = createStorage();

    runDbQueryMock.mockRejectedValue(new Error('relation "loan_items" does not exist'));

    const result = await storage.getLoanItems({ page: 3, limit: 7 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        data: [],
        total: 0,
        page: 3,
        limit: 7,
      });
    }

    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Loan items table does not exist yet, returning empty list',
      expect.objectContaining({ error: expect.stringContaining('loan_items') }),
    );
  });

  it('wraps unexpected failures into DatabaseError and logs error details', async () => {
    const storage = createStorage();

    runDbQueryMock.mockRejectedValue(new Error('temporary db timeout'));

    const result = await storage.getLoanItems({ search: 'tripod' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('récupération des fiches prêt');
      expect(result.error.message).toContain('temporary db timeout');
    }

    expect(loggerMock.error).toHaveBeenCalledWith(
      'Error fetching loan items',
      expect.objectContaining({
        error: 'temporary db timeout',
        options: { search: 'tripod' },
      }),
    );
  });
});
