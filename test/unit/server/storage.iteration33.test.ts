import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
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
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
};

const loggerMock: LoggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

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
    runDbQuery: vi.fn(),
    getPoolStats: vi.fn(),
    db: {
      select: mockDb.select,
      insert: mockDb.insert,
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
        public constructor(_config: unknown) {
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

function createStorage(): InstanceType<StorageModule['DatabaseStorage']> {
  delete cjsRequire.cache[storageModulePath];
  const storageModule = cjsRequire(storageModulePath) as StorageModule;
  return new storageModule.DatabaseStorage();
}

describe('server/storage.js - iteration 33 financial comparison/report branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getFinancialComparison computes deltas and percentage changes from non-zero baselines', async () => {
    const storage = createStorage();

    const subscriptions = [
      { amountInCents: 1000, createdAt: '2024-02-10T00:00:00.000Z' },
      { amountInCents: 2000, createdAt: '2025-04-10T00:00:00.000Z' },
    ];
    const sponsorships = [
      { amount: 500, status: 'confirmed', createdAt: '2024-06-01T00:00:00.000Z' },
      { amount: 1500, status: 'completed', createdAt: '2025-07-01T00:00:00.000Z' },
    ];
    const expenses = [
      { amountInCents: 400, expenseDate: '2024-08-15T00:00:00.000Z' },
      { amountInCents: 900, expenseDate: '2025-09-15T00:00:00.000Z' },
    ];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, sponsorships],
          [schema.financialExpenses, expenses],
        ]),
      ),
    );

    const result = await storage.getFinancialComparison(
      { period: 'year', year: 2024 },
      { period: 'year', year: 2025 },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues).toEqual({
        period1: 1500,
        period2: 3500,
        change: 2000,
        changePercent: 133.33,
      });
      expect(result.data.expenses).toEqual({
        period1: 400,
        period2: 900,
        change: 500,
        changePercent: 125,
      });
      expect(result.data.balance).toEqual({
        period1: 1100,
        period2: 2600,
        change: 1500,
        changePercent: 136.36,
      });
    }
  });

  it('getFinancialComparison returns zero percentages when baseline period has zero values', async () => {
    const storage = createStorage();

    const subscriptions = [{ amountInCents: 2000, createdAt: '2025-04-10T00:00:00.000Z' }];
    const sponsorships = [{ amount: 1500, status: 'confirmed', createdAt: '2025-07-01T00:00:00.000Z' }];
    const expenses = [{ amountInCents: 900, expenseDate: '2025-09-15T00:00:00.000Z' }];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, sponsorships],
          [schema.financialExpenses, expenses],
        ]),
      ),
    );

    const result = await storage.getFinancialComparison(
      { period: 'year', year: 2023 },
      { period: 'year', year: 2025 },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.period1).toBe(0);
      expect(result.data.expenses.period1).toBe(0);
      expect(result.data.balance.period1).toBe(0);
      expect(result.data.revenues.changePercent).toBe(0);
      expect(result.data.expenses.changePercent).toBe(0);
      expect(result.data.balance.changePercent).toBe(0);
    }
  });

  it('getFinancialComparison returns DatabaseError when source queries fail', async () => {
    const storage = createStorage();
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('comparison query failed');
    });

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

  it('getFinancialReport monthly mode computes category totals, monthly budgets and wrapped next-period forecast', async () => {
    const storage = createStorage();

    const subscriptions = [
      { amountInCents: 1000, createdAt: '2025-12-11T00:00:00.000Z' },
      { amountInCents: 300, createdAt: '2025-11-11T00:00:00.000Z' },
    ];
    const sponsorships = [
      { amount: 500, status: 'confirmed', createdAt: '2025-12-08T00:00:00.000Z' },
      { amount: 200, status: 'completed', createdAt: '2025-10-08T00:00:00.000Z' },
    ];
    const expenses = [
      { amountInCents: 300, expenseDate: '2025-12-05T00:00:00.000Z', category: 'c1' },
      { amountInCents: 50, expenseDate: '2025-01-05T00:00:00.000Z', category: 'c1' },
    ];
    const categories = [{ id: 'c1', name: 'Operations' }];
    const budgets = [
      { year: 2025, month: 12, category: 'c1', amountInCents: 400 },
      { year: 2025, month: 11, category: 'c1', amountInCents: 200 },
    ];
    const forecasts = [
      { year: 2025, month: 12, forecastedAmountInCents: 1000, confidence: 'medium' },
      { year: 2025, month: 1, forecastedAmountInCents: 2000, confidence: 'high' },
      { year: 2025, month: 1, forecastedAmountInCents: 1000, confidence: 'medium' },
    ];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, sponsorships],
          [schema.financialExpenses, expenses],
          [schema.financialCategories, categories],
          [schema.financialBudgets, budgets],
          [schema.financialForecasts, forecasts],
        ]),
      ),
    );

    const result = await storage.getFinancialReport('monthly', 12, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('2025-12');
      expect(result.data.revenues.total).toBe(1500);
      expect(result.data.expenses.total).toBe(300);
      expect(result.data.expenses.byCategory).toEqual([{ category: 'Operations', amount: 300 }]);
      expect(result.data.budgets.total).toBe(400);
      expect(result.data.variances).toEqual({
        revenues: -2500,
        expenses: -100,
        balance: -2400,
      });
      expect(result.data.forecasts).toEqual({
        nextPeriod: 3000,
        confidence: 'high',
      });
    }
  });

  it('getFinancialReport yearly mode uses fallback category and next-year forecast', async () => {
    const storage = createStorage();

    const subscriptions = [
      { amountInCents: 1000, createdAt: '2025-05-11T00:00:00.000Z' },
      { amountInCents: 700, createdAt: '2024-05-11T00:00:00.000Z' },
    ];
    const sponsorships = [
      { amount: 500, status: 'confirmed', createdAt: '2025-06-08T00:00:00.000Z' },
      { amount: 100, status: 'completed', createdAt: '2024-06-08T00:00:00.000Z' },
    ];
    const expenses = [{ amountInCents: 250, expenseDate: '2025-03-05T00:00:00.000Z', category: 'missing' }];
    const categories: Array<{ id: string; name: string }> = [];
    const budgets = [{ year: 2025, category: 'missing', amountInCents: 300 }];
    const forecasts = [
      { year: 2025, forecastedAmountInCents: 2000, confidence: 'medium' },
      { year: 2026, forecastedAmountInCents: 900, confidence: 'low' },
    ];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, sponsorships],
          [schema.financialExpenses, expenses],
          [schema.financialCategories, categories],
          [schema.financialBudgets, budgets],
          [schema.financialForecasts, forecasts],
        ]),
      ),
    );

    const result = await storage.getFinancialReport('yearly', 1, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('2025');
      expect(result.data.revenues.total).toBe(1500);
      expect(result.data.expenses.byCategory).toEqual([{ category: 'Autre', amount: 250 }]);
      expect(result.data.budgets.byCategory).toEqual([{ category: 'Autre', amount: 300 }]);
      expect(result.data.forecasts).toEqual({
        nextPeriod: 900,
        confidence: 'low',
      });
      expect(result.data.variances).toEqual({
        revenues: -500,
        expenses: -50,
        balance: -450,
      });
    }
  });

  it('getFinancialReport returns DatabaseError when query chain throws', async () => {
    const storage = createStorage();
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('report query failed');
    });

    const result = await storage.getFinancialReport('monthly', 1, 2025);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('rapport financier');
    }
  });

  it('getUserByEmail delegates to getUser and returns the matched admin', async () => {
    const storage = createStorage();
    const admin = { email: 'admin@komuno.fr', status: 'active' };

    mockDb.select.mockImplementation(() => ({
      from: (_table: unknown) => ({
        where: async (_clause: unknown) => [admin],
      }),
    }));

    const result = await storage.getUserByEmail('admin@komuno.fr');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(admin);
    }
  });

  it('createUser returns DuplicateError when admin already exists', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementation(() => ({
      from: (_table: unknown) => ({
        where: async (_clause: unknown) => [{ email: 'existing@komuno.fr' }],
      }),
    }));

    const result = await storage.createUser({ email: 'existing@komuno.fr' });

    expect(result.success).toBe(false);
    expect(mockDb.insert).not.toHaveBeenCalled();
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('déjà existant');
    }
  });

  it('createUser inserts and returns admin when no duplicate is found', async () => {
    const storage = createStorage();
    const createdAdmin = { id: 10, email: 'new@komuno.fr', status: 'pending' };

    mockDb.select.mockImplementation(() => ({
      from: (_table: unknown) => ({
        where: async (_clause: unknown) => [],
      }),
    }));

    mockDb.insert.mockReturnValue({
      values: () => ({
        returning: async () => [createdAdmin],
      }),
    });

    const result = await storage.createUser({ email: 'new@komuno.fr', status: 'pending' });

    expect(result.success).toBe(true);
    expect(mockDb.insert).toHaveBeenCalled();
    if (result.success) {
      expect(result.data).toEqual(createdAdmin);
    }
  });

  it('createUser returns DatabaseError when insert chain throws', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementation(() => ({
      from: (_table: unknown) => ({
        where: async (_clause: unknown) => [],
      }),
    }));

    mockDb.insert.mockReturnValue({
      values: () => ({
        returning: async () => {
          throw new Error('insert exploded');
        },
      }),
    });

    const result = await storage.createUser({ email: 'broken@komuno.fr' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('création utilisateur');
    }
  });
});
