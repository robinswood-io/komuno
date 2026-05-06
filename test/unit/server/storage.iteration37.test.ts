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

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');
const emailServiceModulePath = cjsRequire.resolve('../../../server/email-service.js');
const schemaPath = cjsRequire.resolve('../../../shared/schema.js');
const schema = cjsRequire(schemaPath) as Record<string, unknown>;

const mockSelect = vi.fn();

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
      select: mockSelect,
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn(),
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
    emailService: {
      setStorage: vi.fn(),
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

async function createStorage(): Promise<InstanceType<StorageModule['DatabaseStorage']>> {
  setupStorageDependencies();
  delete cjsRequire.cache[storageModulePath];
  const storageModule = (await import('../../../server/storage.js')) as StorageModule;
  return new storageModule.DatabaseStorage();
}

describe('server/storage.js iteration 37 - annual report uncovered filters around 4165-4199', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('filters annual sponsorships and expenses by year and groups expenses with fallback category', async () => {
    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1000, createdAt: '2025-01-05T00:00:00.000Z' },
              { amountInCents: 200, createdAt: '2024-12-31T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 600, status: 'confirmed', createdAt: '2025-02-10T00:00:00.000Z' },
              { amount: 150, status: 'completed', createdAt: '2024-06-10T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 300, expenseDate: '2025-03-15', category: 'cat-1' },
              { amountInCents: 100, expenseDate: '2025-04-20', category: 'cat-missing' },
              { amountInCents: 500, expenseDate: '2024-11-20', category: 'cat-1' },
            ],
          ],
          [schema.financialCategories, [{ id: 'cat-1', name: 'Operations' }]],
          [
            schema.financialBudgets,
            [
              { year: 2025, category: 'cat-1', amountInCents: 700 },
              { year: 2025, category: 'cat-missing', amountInCents: 50 },
            ],
          ],
          [
            schema.financialForecasts,
            [
              { year: 2025, forecastedAmountInCents: 1200, confidence: 'medium' },
              { year: 2026, forecastedAmountInCents: 800, confidence: 'high' },
            ],
          ],
        ]),
      ),
    );

    const storage = await createStorage();
    const result = await storage.getFinancialReport('yearly', 1, 2025);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.period).toBe('2025');
    expect(result.data.revenues).toEqual({
      subscriptions: 1000,
      sponsorships: 600,
      other: 0,
      total: 1600,
    });
    expect(result.data.expenses.total).toBe(400);
    expect(result.data.expenses.byCategory).toEqual(
      expect.arrayContaining([
        { category: 'Operations', amount: 300 },
        { category: 'Autre', amount: 100 },
      ]),
    );
    expect(result.data.budgets.total).toBe(750);
    expect(result.data.forecasts).toEqual({
      nextPeriod: 800,
      confidence: 'high',
    });
  });

  it('keeps annual branch active with non-standard type and excludes sponsorships/expenses from other years', async () => {
    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 250, createdAt: '2026-01-01T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 900, status: 'confirmed', createdAt: '2025-01-01T00:00:00.000Z' }]],
          [schema.financialExpenses, [{ amountInCents: 700, expenseDate: '2025-07-01', category: 'cat-1' }]],
          [schema.financialCategories, [{ id: 'cat-1', name: 'Operations' }]],
          [schema.financialBudgets, [{ year: 2026, category: 'cat-1', amountInCents: 100 }]],
          [schema.financialForecasts, [{ year: 2027, forecastedAmountInCents: 300, confidence: 'low' }]],
        ]),
      ),
    );

    const storage = await createStorage();
    const result = await storage.getFinancialReport('annual', 1, 2026);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.revenues.sponsorships).toBe(0);
    expect(result.data.expenses.total).toBe(0);
    expect(result.data.expenses.byCategory).toEqual([]);
  });
});
