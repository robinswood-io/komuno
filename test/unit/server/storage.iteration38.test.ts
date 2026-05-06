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

describe('server/storage.js iteration 38 - coverage around update/generate forecasts and KPI entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('updateForecast returns NotFoundError when update returning is empty', async () => {
    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([[schema.financialForecasts, [{ id: 'f-1', forecastedAmountInCents: 1000 }]]]),
      ),
    );
    mockUpdate.mockReturnValue({
      set: (_payload: unknown) => ({
        where: (_clause: unknown) => ({
          returning: async () => [],
        }),
      }),
    });

    const storage = await createStorage();
    const result = await storage.updateForecast('f-1', { forecastedAmountInCents: 1100 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Prévision non trouvée');
    }
  });

  it('updateForecast wraps select failure into DatabaseError', async () => {
    mockSelect.mockImplementation(() => {
      throw new Error('forecast select failed');
    });

    const storage = await createStorage();
    const result = await storage.updateForecast('f-err', { forecastedAmountInCents: 1200 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('mise à jour de la prévision');
    }
  });

  it('generateForecasts pushes inserted forecasts and returns success data', async () => {
    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [{ amountInCents: 2500, createdAt: new Date('2024-05-01T00:00:00.000Z').toISOString() }],
          ],
          [schema.eventSponsorships, []],
          [schema.financialCategories, [{ id: 'inc-sub', type: 'income', name: 'Souscriptions' }]],
        ]),
      ),
    );
    mockInsert.mockReturnValue({
      values: (payload: Record<string, unknown>) => ({
        returning: async () => [{ id: 'forecast-1', ...payload }],
      }),
    });

    const storage = await createStorage();
    const result = await storage.generateForecasts('year', 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('forecast-1');
      expect(result.data[0].confidence).toBe('low');
    }
  });

  it('generateForecasts wraps insert failure into DatabaseError', async () => {
    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [schema.eventSponsorships, []],
          [schema.financialCategories, [{ id: 'inc-1', type: 'income', name: 'Autres revenus' }]],
        ]),
      ),
    );
    mockInsert.mockReturnValue({
      values: (_payload: Record<string, unknown>) => ({
        returning: async () => {
          throw new Error('forecast insert failed');
        },
      }),
    });

    const storage = await createStorage();
    const result = await storage.generateForecasts('year', 2025);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('génération des prévisions');
    }
  });

  it('getFinancialKPIsExtended uses current year fallback when year is undefined', async () => {
    const currentYear = new Date().getFullYear();
    mockSelect.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.memberSubscriptions,
            [
              { amountInCents: 1000, createdAt: `${currentYear}-01-10T00:00:00.000Z` },
              { amountInCents: 400, createdAt: `${currentYear - 1}-01-10T00:00:00.000Z` },
            ],
          ],
          [
            schema.eventSponsorships,
            [
              { amount: 200, createdAt: `${currentYear}-02-10T00:00:00.000Z` },
              { amount: 50, createdAt: `${currentYear - 1}-02-10T00:00:00.000Z` },
            ],
          ],
          [
            schema.financialForecasts,
            [
              { year: currentYear, forecastedAmountInCents: 900 },
              { year: currentYear - 1, forecastedAmountInCents: 300 },
            ],
          ],
          [
            schema.financialExpenses,
            [
              { amountInCents: 300, expenseDate: `${currentYear}-03-01` },
              { amountInCents: 40, expenseDate: `${currentYear - 1}-03-01` },
            ],
          ],
          [
            schema.financialBudgets,
            [
              { year: currentYear, amountInCents: 500 },
              { year: currentYear - 1, amountInCents: 20 },
            ],
          ],
        ]),
      ),
    );

    const storage = await createStorage();
    const result = await storage.getFinancialKPIsExtended('year', undefined);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(1650);
      expect(result.data.revenues.forecasted).toBe(900);
      expect(result.data.expenses.actual).toBe(340);
      expect(result.data.expenses.budgeted).toBe(500);
    }
  });
});
