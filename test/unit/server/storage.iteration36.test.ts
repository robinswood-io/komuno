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
const mockSetStorage = vi.fn();

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
      setStorage: mockSetStorage,
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

async function loadStorageModule(): Promise<StorageModule> {
  setupStorageDependencies();
  delete cjsRequire.cache[storageModulePath];
  return import('../../../server/storage.js');
}

describe('server/storage.js iteration 36 - financial report forecast wrap-around branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('covers monthly next-period wrap from December to month=1 and forecast aggregation', async () => {
    const { DatabaseStorage } = await loadStorageModule();
    const storage = new DatabaseStorage();

    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 1200, createdAt: '2025-12-11T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 300, status: 'confirmed', createdAt: '2025-12-12T00:00:00.000Z' }]],
          [schema.financialExpenses, [{ amountInCents: 500, expenseDate: '2025-12-10', category: 'cat-ops' }]],
          [schema.financialCategories, [{ id: 'cat-ops', name: 'Operations' }]],
          [schema.financialBudgets, [{ year: 2025, month: 12, category: 'cat-ops', amountInCents: 700 }]],
          [
            schema.financialForecasts,
            [
              { year: 2025, month: 12, forecastedAmountInCents: 1500, confidence: 'high' },
              { year: 2025, month: 1, forecastedAmountInCents: 400, confidence: 'medium' },
              { year: 2025, month: 2, forecastedAmountInCents: 100, confidence: 'low' },
            ],
          ],
        ]),
      ),
    );

    const result = await storage.getFinancialReport('monthly', 12, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('2025-12');
      expect(result.data.variances.revenues).toBe(-500);
      expect(result.data.forecasts.nextPeriod).toBe(400);
      expect(result.data.forecasts.confidence).toBe('medium');
    }
  });

  it('covers quarterly next-period wrap from Q4 to quarter=1 and related branch paths', async () => {
    const { DatabaseStorage } = await loadStorageModule();
    const storage = new DatabaseStorage();

    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 900, createdAt: '2025-10-08T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 100, status: 'completed', createdAt: '2025-11-03T00:00:00.000Z' }]],
          [schema.financialExpenses, [{ amountInCents: 600, expenseDate: '2025-10-20', category: 'cat-ops' }]],
          [schema.financialCategories, [{ id: 'cat-ops', name: 'Operations' }]],
          [schema.financialBudgets, [{ year: 2025, quarter: 4, category: 'cat-ops', amountInCents: 500 }]],
          [
            schema.financialForecasts,
            [
              { year: 2025, quarter: 4, forecastedAmountInCents: 1200, confidence: 'low' },
              { year: 2025, quarter: 1, forecastedAmountInCents: 900, confidence: 'high' },
              { year: 2025, quarter: 2, forecastedAmountInCents: 100, confidence: 'low' },
            ],
          ],
        ]),
      ),
    );

    const result = await storage.getFinancialReport('quarterly', 4, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('T4 2025');
      expect(result.data.variances.revenues).toBe(-1200);
      expect(result.data.forecasts.nextPeriod).toBe(900);
      expect(result.data.forecasts.confidence).toBe('high');
    }
  });
});
