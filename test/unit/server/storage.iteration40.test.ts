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

describe('server/storage.js iteration 40 - targeted low coverage around 3966+ blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('generateForecasts executes push/return path with inserted forecast rows', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 1200, createdAt: '2024-01-10T00:00:00.000Z' }]],
          [schema.eventSponsorships, []],
          [schema.financialCategories, [{ id: 'income-sub', type: 'income', name: 'Souscriptions annuelles' }]],
        ]),
      ),
    );

    mockDb.insert.mockReturnValue({
      values: (payload: Record<string, unknown>) => ({
        returning: async () => [{ id: 'forecast-40-1', ...payload }],
      }),
    });

    const storage = createStorage();
    const result = await storage.generateForecasts('year', 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('forecast-40-1');
      expect(result.data[0].forecastedAmountInCents).toBe(1200);
    }
  });

  it('getFinancialKPIsExtended applies year filters on sponsorships, expenses and budgets', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1000, createdAt: '2025-01-01T00:00:00.000Z' },
              { amountInCents: 500, createdAt: '2024-01-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 700, status: 'confirmed', createdAt: '2025-02-01T00:00:00.000Z' },
              { amount: 200, status: 'completed', createdAt: '2024-02-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialForecasts,
            [
              { year: 2025, forecastedAmountInCents: 2000 },
              { year: 2024, forecastedAmountInCents: 300 },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 600, expenseDate: '2025-03-01' },
              { amountInCents: 100, expenseDate: '2024-03-01' },
            ],
          ],
          [
            schema.financialBudgets,
            [
              { year: 2025, amountInCents: 800 },
              { year: 2024, amountInCents: 50 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(1700);
      expect(result.data.expenses.actual).toBe(600);
      expect(result.data.expenses.budgeted).toBe(800);
    }
  });

  it('getFinancialComparison executes per-period calculation function and returns deltas', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 500, createdAt: '2024-04-01T00:00:00.000Z' },
              { amountInCents: 1200, createdAt: '2025-04-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 300, status: 'confirmed', createdAt: '2024-05-01T00:00:00.000Z' },
              { amount: 600, status: 'completed', createdAt: '2025-05-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 200, expenseDate: '2024-06-01' },
              { amountInCents: 500, expenseDate: '2025-06-01' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison(
      { period: 'year', year: 2024 },
      { period: 'year', year: 2025 },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.period1).toBe(800);
      expect(result.data.revenues.period2).toBe(1800);
      expect(result.data.expenses.period1).toBe(200);
      expect(result.data.expenses.period2).toBe(500);
    }
  });
});
