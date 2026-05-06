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
const emailServiceModulePath = cjsRequire.resolve('../../../server/email-service.js');
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

const setStorageMock = vi.fn();

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
  setStorageMock.mockReset();

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
  setCjsModule(emailServiceModulePath, {
    emailService: {
      setStorage: setStorageMock,
    },
  });
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

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

function createStorage(): InstanceType<StorageModule['DatabaseStorage']> {
  const storageModule = loadStorageModule();
  return new storageModule.DatabaseStorage();
}

describe('server/storage.js iteration 34 - deep remaining financial branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('executes module footer injection by calling emailService.setStorage with exported storage', () => {
    const storageModule = loadStorageModule();

    expect(setStorageMock).toHaveBeenCalledTimes(1);
    expect(setStorageMock).toHaveBeenCalledWith(storageModule.storage);
  });

  it('covers getFinancialKPIsExtended branches for year filter false and true', async () => {
    const storage = createStorage();
    const currentYear = new Date().getFullYear();

    const subscriptions = [
      { amountInCents: 1200, createdAt: `${currentYear}-03-01T00:00:00.000Z` },
      { amountInCents: 300, createdAt: `${currentYear - 1}-03-01T00:00:00.000Z` },
    ];
    const sponsorships = [
      { amount: 800, createdAt: `${currentYear}-04-01T00:00:00.000Z` },
      { amount: 100, createdAt: `${currentYear - 1}-04-01T00:00:00.000Z` },
    ];
    const forecasts = [{ year: currentYear, forecastedAmountInCents: 1500 }];
    const expenses = [
      { amountInCents: 400, expenseDate: `${currentYear}-05-10` },
      { amountInCents: 50, expenseDate: `${currentYear - 1}-05-10` },
    ];
    const budgets = [{ year: currentYear, amountInCents: 600 }];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, sponsorships],
          [schema.financialForecasts, forecasts],
          [schema.financialExpenses, expenses],
          [schema.financialBudgets, budgets],
        ]),
      ),
    );

    const withoutYearFilter = await storage.getFinancialKPIsExtended('year', undefined);
    expect(withoutYearFilter.success).toBe(true);
    if (withoutYearFilter.success) {
      expect(withoutYearFilter.data.revenues.actual).toBe(2400);
      expect(withoutYearFilter.data.revenues.forecasted).toBe(1500);
    }

    const withYearFilter = await storage.getFinancialKPIsExtended('year', currentYear);
    expect(withYearFilter.success).toBe(true);
    if (withYearFilter.success) {
      expect(withYearFilter.data.revenues.actual).toBe(2000);
      expect(withYearFilter.data.expenses.actual).toBe(400);
      expect(withYearFilter.data.realizationRate).toBe(133.33);
    }
  });

  it('covers getFinancialComparison balance-change ternary true and false paths', async () => {
    const storage = createStorage();

    const subscriptions = [
      { amountInCents: 1000, createdAt: '2025-01-01T00:00:00.000Z' },
      { amountInCents: 2000, createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    const sponsorships = [
      { amount: 500, status: 'confirmed', createdAt: '2025-02-01T00:00:00.000Z' },
      { amount: 1000, status: 'completed', createdAt: '2026-02-01T00:00:00.000Z' },
    ];
    const expenses = [
      { amountInCents: 300, expenseDate: '2025-03-01T00:00:00.000Z' },
      { amountInCents: 700, expenseDate: '2026-03-01T00:00:00.000Z' },
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

    const nonZeroBaseline = await storage.getFinancialComparison(
      { period: 'year', year: 2025 },
      { period: 'year', year: 2026 },
    );
    expect(nonZeroBaseline.success).toBe(true);
    if (nonZeroBaseline.success) {
      expect(nonZeroBaseline.data.balance.period1).toBe(1200);
      expect(nonZeroBaseline.data.balance.changePercent).toBe(91.67);
    }

    const zeroBaseline = await storage.getFinancialComparison(
      { period: 'year', year: 2024 },
      { period: 'year', year: 2026 },
    );
    expect(zeroBaseline.success).toBe(true);
    if (zeroBaseline.success) {
      expect(zeroBaseline.data.balance.period1).toBe(0);
      expect(zeroBaseline.data.balance.changePercent).toBe(0);
    }
  });

  it('covers quarterly report branch when first budget has no quarter and report catch path', async () => {
    const storage = createStorage();

    const subscriptions = [{ amountInCents: 900, createdAt: '2025-04-15T00:00:00.000Z' }];
    const sponsorships = [{ amount: 300, status: 'confirmed', createdAt: '2025-05-20T00:00:00.000Z' }];
    const expenses = [{ amountInCents: 250, expenseDate: '2025-04-10', category: 'cat-1' }];
    const categories = [{ id: 'cat-1', name: 'Operations' }];
    const budgets = [
      { year: 2025, category: 'cat-1', amountInCents: 700 },
      { year: 2025, category: 'cat-1', amountInCents: 100 },
    ];
    const forecasts = [
      { year: 2025, quarter: 3, forecastedAmountInCents: 1500, confidence: 'medium' },
      { year: 2025, quarter: 3, forecastedAmountInCents: 500, confidence: 'low' },
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

    const quarterly = await storage.getFinancialReport('quarterly', 2, 2025);
    expect(quarterly.success).toBe(true);
    if (quarterly.success) {
      expect(quarterly.data.period).toBe('T2 2025');
      expect(quarterly.data.budgets.total).toBe(800);
      expect(quarterly.data.forecasts).toEqual({
        nextPeriod: 2000,
        confidence: 'medium',
      });
    }

    mockDb.select.mockImplementationOnce(() => {
      throw new Error('forced quarterly report failure');
    });

    const failed = await storage.getFinancialReport('quarterly', 2, 2025);
    expect(failed.success).toBe(false);
    if (!failed.success) {
      expect(failed.error.name).toBe('DatabaseError');
      expect(failed.error.message).toContain('rapport financier');
    }
  });
});
