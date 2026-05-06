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
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

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
      insert: mockInsert,
      update: mockUpdate,
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

describe('server/storage.js iteration 39 - remaining storage branches from coverage report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('updateForecast returns NotFoundError when forecast id is missing before update call', async () => {
    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.financialForecasts, [{ id: 'other-id', forecastedAmountInCents: 1000 }]],
        ]),
      ),
    );

    const storage = await createStorage();
    const result = await storage.updateForecast('missing-id', { forecastedAmountInCents: 1234 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Prévision non trouvée');
    }
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('generateForecasts monthly sets month field and keeps medium confidence for 3..11 history items', async () => {
    const historicalSubscriptions = Array.from({ length: 4 }, (_value, index) => ({
      amountInCents: 1000 + index * 100,
      createdAt: new Date('2024-04-01T00:00:00.000Z').toISOString(),
    }));

    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, historicalSubscriptions],
          [schema.eventSponsorships, []],
          [schema.financialCategories, [{ id: 'cat-sub', type: 'income', name: 'Souscriptions club' }]],
        ]),
      ),
    );

    const insertedRows: Array<Record<string, unknown>> = [];
    mockInsert.mockReturnValue({
      values: (payload: Record<string, unknown>) => ({
        returning: async () => {
          insertedRows.push(payload);
          return [{ id: 'forecast-month-1', ...payload }];
        },
      }),
    });

    const storage = await createStorage();
    const result = await storage.generateForecasts('month', 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('forecast-month-1');
      expect(result.data[0].month).toBe(1);
      expect(result.data[0].quarter).toBeUndefined();
      expect(result.data[0].confidence).toBe('medium');
    }

    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].month).toBe(1);
    expect(insertedRows[0].quarter).toBeUndefined();
    expect(insertedRows[0].confidence).toBe('medium');
  });

  it('generateForecasts quarterly sets quarter field for sponsoring category with historical averaging', async () => {
    const historicalSponsorships = Array.from({ length: 5 }, (_value, index) => ({
      amount: 2000 + index * 50,
      createdAt: new Date('2024-05-01T00:00:00.000Z').toISOString(),
      status: 'confirmed',
    }));

    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [schema.eventSponsorships, historicalSponsorships],
          [schema.financialCategories, [{ id: 'cat-sp', type: 'income', name: 'Sponsoring partenaires' }]],
        ]),
      ),
    );

    mockInsert.mockReturnValue({
      values: (payload: Record<string, unknown>) => ({
        returning: async () => [{ id: 'forecast-quarter-1', ...payload }],
      }),
    });

    const storage = await createStorage();
    const result = await storage.generateForecasts('quarter', 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].quarter).toBe(1);
      expect(result.data[0].month).toBeUndefined();
      expect(result.data[0].confidence).toBe('medium');
    }
  });

  it('getFinancialReport monthly uses next month period + 1 and computes medium forecast confidence', async () => {
    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 800, createdAt: '2025-06-12T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 200, status: 'confirmed', createdAt: '2025-06-08T00:00:00.000Z' }]],
          [schema.financialExpenses, [{ amountInCents: 300, expenseDate: '2025-06-10', category: 'cat-ops' }]],
          [schema.financialCategories, [{ id: 'cat-ops', name: 'Operations' }]],
          [schema.financialBudgets, [{ year: 2025, month: 6, category: 'cat-ops', amountInCents: 400 }]],
          [
            schema.financialForecasts,
            [
              { year: 2025, month: 6, forecastedAmountInCents: 1000, confidence: 'high' },
              { year: 2025, month: 7, forecastedAmountInCents: 700, confidence: 'medium' },
            ],
          ],
        ]),
      ),
    );

    const storage = await createStorage();
    const result = await storage.getFinancialReport('monthly', 6, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('2025-06');
      expect(result.data.forecasts.nextPeriod).toBe(700);
      expect(result.data.forecasts.confidence).toBe('medium');
    }
  });

  it('getFinancialReport quarterly uses next quarter period + 1 when period is not Q4', async () => {
    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, [{ amountInCents: 1100, createdAt: '2025-05-04T00:00:00.000Z' }]],
          [schema.eventSponsorships, [{ amount: 400, status: 'completed', createdAt: '2025-04-09T00:00:00.000Z' }]],
          [schema.financialExpenses, [{ amountInCents: 500, expenseDate: '2025-05-20', category: 'cat-ops' }]],
          [schema.financialCategories, [{ id: 'cat-ops', name: 'Operations' }]],
          [schema.financialBudgets, [{ year: 2025, quarter: 2, category: 'cat-ops', amountInCents: 600 }]],
          [
            schema.financialForecasts,
            [
              { year: 2025, quarter: 2, forecastedAmountInCents: 1000, confidence: 'medium' },
              { year: 2025, quarter: 3, forecastedAmountInCents: 900, confidence: 'high' },
            ],
          ],
        ]),
      ),
    );

    const storage = await createStorage();
    const result = await storage.getFinancialReport('quarterly', 2, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('T2 2025');
      expect(result.data.forecasts.nextPeriod).toBe(900);
      expect(result.data.forecasts.confidence).toBe('high');
    }
  });
});
