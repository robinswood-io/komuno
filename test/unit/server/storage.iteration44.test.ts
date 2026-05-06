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

describe('server/storage.js iteration 44 - late KPI/comparison branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('getFinancialKPIsExtended returns failure when select throws', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('kpi-select-failed');
    });

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2028);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors du calcul des KPIs financiers étendus');
    }
  });

  it('getFinancialKPIsExtended without year uses all rows and computes variance percentages', async () => {
    const currentYear = new Date().getFullYear();

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1200, createdAt: '2027-02-01T00:00:00.000Z' },
              { amountInCents: 800, createdAt: '2028-03-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 400, status: 'confirmed', createdAt: '2027-04-01T00:00:00.000Z' },
              { amount: 600, status: 'completed', createdAt: '2028-05-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialForecasts,
            [{ year: currentYear, forecastedAmountInCents: 2500 }],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 500, expenseDate: '2027-06-01' },
              { amountInCents: 400, expenseDate: '2028-07-01' },
            ],
          ],
          [
            schema.financialBudgets,
            [{ year: currentYear, amountInCents: 700 }],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', undefined);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(3000);
      expect(result.data.revenues.forecasted).toBe(2500);
      expect(result.data.revenues.variancePercent).toBe(20);
      expect(result.data.expenses.actual).toBe(900);
      expect(result.data.expenses.budgeted).toBe(700);
      expect(result.data.expenses.variancePercent).toBeCloseTo(28.57, 2);
      expect(result.data.realizationRate).toBe(120);
    }
  });

  it('getFinancialComparison uses absolute baseline for negative period1 balance', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1000, createdAt: '2029-01-10T00:00:00.000Z' },
              { amountInCents: 2200, createdAt: '2030-01-10T00:00:00.000Z' },
            ],
          ],
          [schema.eventSponsorships, []],
          [
            schema.financialExpenses,
            [
              { amountInCents: 1600, expenseDate: '2029-02-01' },
              { amountInCents: 600, expenseDate: '2030-02-01' },
            ],
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
      expect(result.data.balance.period1).toBe(-600);
      expect(result.data.balance.period2).toBe(1600);
      expect(result.data.balance.change).toBe(2200);
      expect(result.data.balance.changePercent).toBeCloseTo(366.67, 2);
      expect(result.data.revenues.changePercent).toBe(120);
      expect(result.data.expenses.changePercent).toBe(-62.5);
    }
  });
});
