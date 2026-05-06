import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type CjsCacheModule = {
  id: string;
  filename: string;
  loaded: boolean;
  children: unknown[];
  paths: string[];
  exports: unknown;
};

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
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

  setCjsModule(loggerModulePath, {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
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
  setCjsModule(emailServiceModulePath, {
    emailService: { setStorage: vi.fn() },
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

function createStorage(): InstanceType<StorageModule['DatabaseStorage']> {
  setupStorageDependencies();
  delete cjsRequire.cache[storageModulePath];
  const storageModule = cjsRequire(storageModulePath) as StorageModule;
  return new storageModule.DatabaseStorage();
}

describe('server/storage.js iteration 43 - late KPI/comparison/report paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('getFinancialKPIsExtended handles multiple matching year rows for sponsorships/expenses/budgets', async () => {
    const targetYear = 2028;

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 500, createdAt: '2028-01-05T00:00:00.000Z' },
              { amountInCents: 600, createdAt: '2028-04-05T00:00:00.000Z' },
              { amountInCents: 100, createdAt: '2027-04-05T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 300, status: 'confirmed', createdAt: '2028-02-01T00:00:00.000Z' },
              { amount: 400, status: 'completed', createdAt: '2028-06-01T00:00:00.000Z' },
              { amount: 999, status: 'completed', createdAt: '2027-06-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialForecasts,
            [
              { year: 2028, forecastedAmountInCents: 2500 },
              { year: 2028, forecastedAmountInCents: 500 },
              { year: 2027, forecastedAmountInCents: 111 },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 350, expenseDate: '2028-03-10' },
              { amountInCents: 450, expenseDate: '2028-07-10' },
              { amountInCents: 55, expenseDate: '2027-07-10' },
            ],
          ],
          [
            schema.financialBudgets,
            [
              { year: 2028, amountInCents: 900 },
              { year: 2028, amountInCents: 200 },
              { year: 2027, amountInCents: 50 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', targetYear);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(1800);
      expect(result.data.revenues.forecasted).toBe(3000);
      expect(result.data.expenses.actual).toBe(800);
      expect(result.data.expenses.budgeted).toBe(1100);
      expect(result.data.balance.actual).toBe(1000);
    }
  });

  it('getFinancialComparison computes zero percents when first period has no revenues/expenses', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [{ amountInCents: 1500, createdAt: '2030-01-01T00:00:00.000Z' }],
          ],
          [
            schema.eventSponsorships,
            [{ amount: 700, status: 'confirmed', createdAt: '2030-01-15T00:00:00.000Z' }],
          ],
          [
            schema.financialExpenses,
            [{ amountInCents: 900, expenseDate: '2030-02-01' }],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison(
      { period: 'year', year: 2029 },
      { period: 'year', year: 2030 },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.period1).toBe(0);
      expect(result.data.revenues.period2).toBe(2200);
      expect(result.data.revenues.changePercent).toBe(0);
      expect(result.data.expenses.period1).toBe(0);
      expect(result.data.expenses.period2).toBe(900);
      expect(result.data.expenses.changePercent).toBe(0);
    }
  });

  it('getFinancialReport yearly uses next-year forecasts and computes medium confidence average', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 1000, createdAt: '2028-02-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 200, status: 'completed', createdAt: '2028-03-01T00:00:00.000Z' }]],
          [schema.financialExpenses, [{ amountInCents: 500, expenseDate: '2028-04-01', category: 'cat-ops' }]],
          [schema.financialCategories, [{ id: 'cat-ops', name: 'Operations' }]],
          [schema.financialBudgets, [{ year: 2028, category: 'cat-ops', amountInCents: 700 }]],
          [
            schema.financialForecasts,
            [
              { year: 2028, forecastedAmountInCents: 1300, confidence: 'high' },
              { year: 2029, forecastedAmountInCents: 600, confidence: 'high' },
              { year: 2029, forecastedAmountInCents: 400, confidence: 'low' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialReport('yearly', 1, 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('2028');
      expect(result.data.forecasts.nextPeriod).toBe(1000);
      expect(result.data.forecasts.confidence).toBe('medium');
      expect(result.data.variances.revenues).toBe(-100);
    }
  });
});
