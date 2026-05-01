import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');
const schemaPath = cjsRequire.resolve('../../../shared/schema.js');
const schema = cjsRequire(schemaPath) as Record<string, unknown>;

const mockDb: DbMock = {
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  insert: vi.fn(),
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
      insert: mockDb.insert,
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

function selectBuilder(dataByTable: Map<unknown, unknown[]>): {
  from: (table: unknown) => {
    where: (_clause: unknown) => unknown[];
    then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => unknown;
  };
} {
  return {
    from: (table: unknown) => {
      const data = dataByTable.get(table) ?? [];
      return {
        where: (_clause: unknown) => data,
        then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(data).then(resolve, reject),
      };
    },
  };
}

function selectFromData(data: unknown[]): {
  from: () => {
    then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => unknown;
  };
} {
  return {
    from: () => ({
      then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(data).then(resolve, reject),
    }),
  };
}

function selectFromWhereData(data: unknown[]): {
  from: () => {
    where: (_clause: unknown) => unknown[];
  };
} {
  return {
    from: () => ({
      where: (_clause: unknown) => data,
    }),
  };
}

function createStorage(): InstanceType<StorageModule['DatabaseStorage']> {
  delete cjsRequire.cache[storageModulePath];
  const storageModule = cjsRequire(storageModulePath) as StorageModule;
  return new storageModule.DatabaseStorage();
}

describe('server/storage.js - iteration 27 precise financial catch/annual branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('covers annual expenses filter callback (line around expenseDate extraction)', async () => {
    const storage = createStorage();

    mockDb.select
      .mockImplementationOnce(() =>
        selectFromData([{ amountInCents: 1000, createdAt: '2025-01-01T00:00:00Z' }]),
      )
      .mockImplementationOnce(() => selectFromWhereData([]))
      .mockImplementationOnce(() =>
        selectFromData([{ amountInCents: 700, category: 'c1', expenseDate: '2025-06-01T00:00:00Z' }]),
      )
      .mockImplementationOnce(() => selectFromData([{ id: 'c1', name: 'Charges' }]))
      .mockImplementationOnce(() =>
        selectFromData([{ amountInCents: 900, category: 'c1', year: 2025 }]),
      )
      .mockImplementationOnce(() =>
        selectFromData([{ year: 2026, forecastedAmountInCents: 1200, confidence: 'medium' }]),
      );

    const result = await storage.getFinancialReport('annual', 1, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses.total).toBe(700);
      expect(result.data.expenses.byCategory[0]?.category).toBe('Charges');
    }
  });

  it('covers getFinancialComparison success return block', async () => {
    const storage = createStorage();

    mockDb.select
      .mockImplementationOnce(() =>
        selectFromData([{ amountInCents: 1000, createdAt: '2024-01-01T00:00:00Z' }]),
      )
      .mockImplementationOnce(() =>
        selectFromWhereData([{ amount: 200, createdAt: '2024-02-01T00:00:00Z', status: 'confirmed' }]),
      )
      .mockImplementationOnce(() =>
        selectFromData([{ amountInCents: 300, expenseDate: '2024-03-01T00:00:00Z' }]),
      )
      .mockImplementationOnce(() =>
        selectFromData([{ amountInCents: 2000, createdAt: '2025-01-01T00:00:00Z' }]),
      )
      .mockImplementationOnce(() =>
        selectFromWhereData([{ amount: 500, createdAt: '2025-02-01T00:00:00Z', status: 'completed' }]),
      )
      .mockImplementationOnce(() =>
        selectFromData([{ amountInCents: 700, expenseDate: '2025-04-01T00:00:00Z' }]),
      );

    const result = await storage.getFinancialComparison(
      { period: 'year', year: 2024 },
      { period: 'year', year: 2025 },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.period1).toBe(1200);
      expect(result.data.revenues.period2).toBe(2500);
      expect(result.data.expenses.period1).toBe(300);
      expect(result.data.expenses.period2).toBe(700);
      expect(result.data.expenses.changePercent).toBeCloseTo(133.33, 2);
      expect(result.data.balance.changePercent).toBe(100);
    }
  });

  it('covers getFinancialComparison catch branch by rejecting from table resolution', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementationOnce(() => ({
      from: () => Promise.reject(new Error('comparison from reject')),
    }));

    const result = await storage.getFinancialComparison(
      { period: 'year', year: 2024 },
      { period: 'year', year: 2025 },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('comparaison financière');
    }
  });

  it('covers getFinancialReport catch branch by rejecting first select resolution', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementationOnce(() => ({
      from: () => Promise.reject(new Error('report from reject')),
    }));

    const result = await storage.getFinancialReport('monthly', 1, 2025);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('génération du rapport financier');
    }
  });

  it('covers getFinancialReport catch branch by synchronous throw on select', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementationOnce(() => {
      throw new Error('sync select boom');
    });

    const result = await storage.getFinancialReport('monthly', 2, 2025);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('génération du rapport financier');
    }
  });
});
