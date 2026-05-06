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

describe('server/storage.js iteration 41 - late-section KPI/comparison/forecast edges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('getFinancialKPIsExtended recomputes revenues and expenses with year-filtered sponsorships and expenses', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1500, createdAt: '2026-01-12T00:00:00.000Z' },
              { amountInCents: 100, createdAt: '2025-01-12T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 900, status: 'confirmed', createdAt: '2026-03-01T00:00:00.000Z' },
              { amount: 80, status: 'completed', createdAt: '2025-03-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialForecasts,
            [
              { year: 2026, forecastedAmountInCents: 2600 },
              { year: 2025, forecastedAmountInCents: 500 },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 700, expenseDate: '2026-02-10' },
              { amountInCents: 50, expenseDate: '2025-02-10' },
            ],
          ],
          [
            schema.financialBudgets,
            [
              { year: 2026, amountInCents: 1000 },
              { year: 2025, amountInCents: 20 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2026);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(2400);
      expect(result.data.revenues.forecasted).toBe(2600);
      expect(result.data.expenses.actual).toBe(700);
      expect(result.data.expenses.budgeted).toBe(1000);
      expect(result.data.revenues.variance).toBe(-200);
    }
  });

  it('getFinancialComparison handles a negative baseline balance using absolute value in percentage', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 200, createdAt: '2024-01-01T00:00:00.000Z' },
              { amountInCents: 800, createdAt: '2025-01-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 100, status: 'confirmed', createdAt: '2024-01-15T00:00:00.000Z' },
              { amount: 200, status: 'completed', createdAt: '2025-01-15T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 900, expenseDate: '2024-02-01' },
              { amountInCents: 500, expenseDate: '2025-02-01' },
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
      expect(result.data.balance.period1).toBe(-600);
      expect(result.data.balance.period2).toBe(500);
      expect(result.data.balance.change).toBe(1100);
      expect(result.data.balance.changePercent).toBe(183.33);
    }
  });

  it('generateForecasts builds sponsoring forecast from historical sponsorship amounts', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [
            schema.eventSponsorships,
            [
              { amount: 1000, createdAt: '2024-05-01T00:00:00.000Z', status: 'confirmed' },
              { amount: 2000, createdAt: '2024-06-01T00:00:00.000Z', status: 'completed' },
            ],
          ],
          [schema.financialCategories, [{ id: 'sp-cat', type: 'income', name: 'Sponsoring premium' }]],
        ]),
      ),
    );

    mockDb.insert.mockReturnValue({
      values: (payload: Record<string, unknown>) => ({
        returning: async () => [{ id: 'forecast-sp-1', ...payload }],
      }),
    });

    const storage = createStorage();
    const result = await storage.generateForecasts('year', 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].forecastedAmountInCents).toBe(1500);
      expect(result.data[0].confidence).toBe('low');
    }
  });
});
