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

describe('server/storage.js iteration 42 - targeted late weak zones 3960+/4000+/4050+', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('getFinancialKPIsExtended executes sponsorship/expense/budget callbacks with non-empty year-matching sets', async () => {
    const targetYear = 2027;

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1200, createdAt: '2027-01-10T00:00:00.000Z' },
              { amountInCents: 300, createdAt: '2026-01-10T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 800, status: 'confirmed', createdAt: '2027-02-01T00:00:00.000Z' },
              { amount: 250, status: 'completed', createdAt: '2026-02-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialForecasts,
            [
              { year: 2027, forecastedAmountInCents: 2100 },
              { year: 2026, forecastedAmountInCents: 500 },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 700, expenseDate: '2027-03-01' },
              { amountInCents: 50, expenseDate: '2026-03-01' },
            ],
          ],
          [
            schema.financialBudgets,
            [
              { year: 2027, amountInCents: 1000 },
              { year: 2027, amountInCents: 200 },
              { year: 2026, amountInCents: 300 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', targetYear);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(2000);
      expect(result.data.revenues.forecasted).toBe(2100);
      expect(result.data.expenses.actual).toBe(700);
      expect(result.data.expenses.budgeted).toBe(1200);
      expect(result.data.balance.actual).toBe(1300);
    }
  });

  it('getFinancialComparison computes percentage deltas from two fully populated periods', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 600, createdAt: '2025-01-01T00:00:00.000Z' },
              { amountInCents: 1400, createdAt: '2026-01-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 200, status: 'confirmed', createdAt: '2025-01-20T00:00:00.000Z' },
              { amount: 500, status: 'completed', createdAt: '2026-01-20T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 300, expenseDate: '2025-02-10' },
              { amountInCents: 650, expenseDate: '2026-02-10' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialComparison(
      { period: 'year', year: 2025 },
      { period: 'year', year: 2026 },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.period1).toBe(800);
      expect(result.data.revenues.period2).toBe(1900);
      expect(result.data.expenses.period1).toBe(300);
      expect(result.data.expenses.period2).toBe(650);
      expect(result.data.balance.period1).toBe(500);
      expect(result.data.balance.period2).toBe(1250);
    }
  });

  it('generateForecasts with multiple income categories returns multiple created rows', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1000, createdAt: '2024-04-01T00:00:00.000Z' },
              { amountInCents: 1200, createdAt: '2024-05-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 700, status: 'confirmed', createdAt: '2024-04-10T00:00:00.000Z' },
              { amount: 900, status: 'completed', createdAt: '2024-05-10T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialCategories,
            [
              { id: 'cat-sub', type: 'income', name: 'Souscriptions' },
              { id: 'cat-sp', type: 'income', name: 'Sponsoring' },
            ],
          ],
        ]),
      ),
    );

    let index = 0;
    mockDb.insert.mockReturnValue({
      values: (payload: Record<string, unknown>) => ({
        returning: async () => {
          index += 1;
          return [{ id: `forecast-42-${index}`, ...payload }];
        },
      }),
    });

    const storage = createStorage();
    const result = await storage.generateForecasts('year', 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('forecast-42-1');
      expect(result.data[1].id).toBe('forecast-42-2');
    }
  });
});
