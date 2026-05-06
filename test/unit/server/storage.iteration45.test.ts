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

describe('server/storage.js iteration 45 - report monthly/quarterly late branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('getFinancialReport monthly filters month budgets and wraps forecasts to January with low confidence', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 900, createdAt: '2028-12-05T00:00:00.000Z' },
              { amountInCents: 999, createdAt: '2028-11-05T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 300, status: 'completed', createdAt: '2028-12-10T00:00:00.000Z' },
              { amount: 111, status: 'confirmed', createdAt: '2028-11-10T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 200, expenseDate: '2028-12-14', category: 'cat-known' },
              { amountInCents: 150, expenseDate: '2028-12-20', category: 'cat-missing' },
              { amountInCents: 999, expenseDate: '2028-11-20', category: 'cat-known' },
            ],
          ],
          [schema.financialCategories, [{ id: 'cat-known', name: 'Known' }]],
          [
            schema.financialBudgets,
            [
              { year: 2028, month: 12, category: 'cat-known', amountInCents: 400 },
              { year: 2028, month: 11, category: 'cat-known', amountInCents: 900 },
            ],
          ],
          [
            schema.financialForecasts,
            [
              { year: 2028, forecastedAmountInCents: 1000, confidence: 'medium' },
              { year: 2028, month: 1, forecastedAmountInCents: 120, confidence: 'low' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialReport('monthly', 12, 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('2028-12');
      expect(result.data.revenues.total).toBe(1200);
      expect(result.data.expenses.total).toBe(350);
      expect(result.data.budgets.total).toBe(400);
      expect(result.data.expenses.byCategory).toEqual(
        expect.arrayContaining([
          { category: 'Known', amount: 200 },
          { category: 'Autre', amount: 150 },
        ]),
      );
      expect(result.data.forecasts.nextPeriod).toBe(120);
      expect(result.data.forecasts.confidence).toBe('low');
    }
  });

  it('getFinancialReport quarterly filters quarter budgets and wraps forecasts to Q1', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 500, createdAt: '2028-10-01T00:00:00.000Z' },
              { amountInCents: 600, createdAt: '2028-12-15T00:00:00.000Z' },
              { amountInCents: 700, createdAt: '2028-08-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 400, status: 'confirmed', createdAt: '2028-11-02T00:00:00.000Z' },
              { amount: 333, status: 'completed', createdAt: '2028-07-02T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 350, expenseDate: '2028-10-09', category: 'cat-q4' },
              { amountInCents: 450, expenseDate: '2028-12-09', category: 'cat-q4' },
              { amountInCents: 999, expenseDate: '2028-09-09', category: 'cat-q3' },
            ],
          ],
          [schema.financialCategories, [{ id: 'cat-q4', name: 'Quarter4' }]],
          [
            schema.financialBudgets,
            [
              { year: 2028, quarter: 4, category: 'cat-q4', amountInCents: 800 },
              { year: 2028, quarter: 3, category: 'cat-q4', amountInCents: 500 },
            ],
          ],
          [
            schema.financialForecasts,
            [
              { year: 2028, forecastedAmountInCents: 1600, confidence: 'high' },
              { year: 2028, quarter: 1, forecastedAmountInCents: 200, confidence: 'high' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getFinancialReport('quarterly', 4, 2028);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('T4 2028');
      expect(result.data.revenues.total).toBe(1500);
      expect(result.data.expenses.total).toBe(800);
      expect(result.data.budgets.total).toBe(800);
      expect(result.data.forecasts.nextPeriod).toBe(200);
      expect(result.data.forecasts.confidence).toBe('high');
    }
  });

  it('getFinancialReport returns failure when DB select throws', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('report-select-failed');
    });

    const storage = createStorage();
    const result = await storage.getFinancialReport('yearly', 1, 2028);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors de la génération du rapport financier');
    }
  });
});
