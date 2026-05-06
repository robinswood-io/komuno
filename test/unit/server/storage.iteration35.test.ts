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

describe('server/storage.js iteration 35 - deep uncovered around 4088+ and tail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('covers getFinancialComparison percentage branches for non-zero and zero baselines', async () => {
    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1000, createdAt: '2024-02-01T00:00:00.000Z' },
              { amountInCents: 2000, createdAt: '2025-02-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 500, status: 'confirmed', createdAt: '2024-03-01T00:00:00.000Z' },
              { amount: 1500, status: 'completed', createdAt: '2025-03-01T00:00:00.000Z' },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 600, expenseDate: '2024-04-01T00:00:00.000Z' },
              { amountInCents: 900, expenseDate: '2025-04-01T00:00:00.000Z' },
            ],
          ],
        ]),
      ),
    );

    const { DatabaseStorage } = await loadStorageModule();
    const storage = new DatabaseStorage();

    const nonZeroBaseline = await storage.getFinancialComparison(
      { period: 'year', year: 2024 },
      { period: 'year', year: 2025 },
    );
    expect(nonZeroBaseline.success).toBe(true);
    if (nonZeroBaseline.success) {
      expect(nonZeroBaseline.data.revenues.changePercent).toBe(133.33);
      expect(nonZeroBaseline.data.expenses.changePercent).toBe(50);
      expect(nonZeroBaseline.data.balance.changePercent).toBe(188.89);
    }

    const zeroBaseline = await storage.getFinancialComparison(
      { period: 'year', year: 2023 },
      { period: 'year', year: 2025 },
    );
    expect(zeroBaseline.success).toBe(true);
    if (zeroBaseline.success) {
      expect(zeroBaseline.data.revenues.period1).toBe(0);
      expect(zeroBaseline.data.expenses.period1).toBe(0);
      expect(zeroBaseline.data.balance.period1).toBe(0);
      expect(zeroBaseline.data.revenues.changePercent).toBe(0);
      expect(zeroBaseline.data.expenses.changePercent).toBe(0);
      expect(zeroBaseline.data.balance.changePercent).toBe(0);
    }
  });

  it('covers catch returns for financial comparison and financial report', async () => {
    const { DatabaseStorage } = await loadStorageModule();
    const storage = new DatabaseStorage();

    mockSelect.mockImplementationOnce(() => {
      throw new Error('comparison exploded');
    });

    const comparisonFailed = await storage.getFinancialComparison(
      { period: 'year', year: 2024 },
      { period: 'year', year: 2025 },
    );
    expect(comparisonFailed.success).toBe(false);
    if (!comparisonFailed.success) {
      expect(comparisonFailed.error.name).toBe('DatabaseError');
      expect(comparisonFailed.error.message).toContain('comparaison financière');
    }

    mockSelect.mockImplementationOnce(() => {
      throw new Error('report exploded');
    });

    const reportFailed = await storage.getFinancialReport('yearly', 1, 2025);
    expect(reportFailed.success).toBe(false);
    if (!reportFailed.success) {
      expect(reportFailed.error.name).toBe('DatabaseError');
      expect(reportFailed.error.message).toContain('rapport financier');
    }
  });

  it('executes module tail wiring: exports + emailService.setStorage(storage)', async () => {
    const storageModule = await loadStorageModule();

    expect(storageModule.storage).toBeDefined();
    expect(mockSetStorage).toHaveBeenCalledTimes(1);
    expect(mockSetStorage).toHaveBeenCalledWith(storageModule.storage);
  });
});
