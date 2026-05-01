import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');
const schemaPath = cjsRequire.resolve('../../../shared/schema.js');
const schema = cjsRequire(schemaPath) as Record<string, unknown>;

const mockDb: DbMock = {
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn(),
};

const runDbQueryMock = vi.fn();

const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

function setCjsModule(path: string, exportsValue: unknown): void {
  const previous = cjsRequire.cache[path];
  cjsRequire.cache[path] = {
    ...(previous ?? {
      id: path,
      filename: path,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: exportsValue,
  };
}

function setupStorageDependencies(): void {
  setCjsModule(dbModulePath, {
    pool: {},
    dbResilience: {},
    QUERY_TIMEOUT_PROFILES: {},
    runDbQuery: runDbQueryMock,
    getPoolStats: vi.fn(),
    db: {
      select: mockDb.select,
      update: mockDb.update,
      delete: mockDb.delete,
      insert: mockDb.insert,
      transaction: mockDb.transaction,
    },
  });

  setCjsModule(loggerModulePath, { logger: loggerMock });

  setCjsModule(expressSessionModulePath, function mockExpressSession() {
    return {};
  });

  setCjsModule(
    connectPgSimpleModulePath,
    () =>
      class MockPostgresSessionStore {
        constructor(_config: unknown) {
          // no-op
        }
      },
  );
}

function selectBuilder(dataByTable: Map<unknown, unknown[]>): {
  from: (table: unknown) => {
    where: (_clause: unknown) => unknown[];
    orderBy: (_clause: unknown) => unknown[];
    then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => unknown;
  };
} {
  return {
    from: (table: unknown) => {
      const data = dataByTable.get(table) ?? [];
      return {
        where: (_clause: unknown) => data,
        orderBy: (_clause: unknown) => data,
        then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(data).then(resolve, reject),
      };
    },
  };
}

function createStorage(): InstanceType<StorageModule['DatabaseStorage']> {
  delete cjsRequire.cache[storageModulePath];
  const storageModule = cjsRequire(storageModulePath) as StorageModule;
  return new storageModule.DatabaseStorage();
}

describe('server/storage.js - iteration 26 financial methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getExpenseById returns DatabaseError when select throws', async () => {
    const storage = createStorage();
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('expense read boom');
    });

    const result = await storage.getExpenseById('exp-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('récupération de la dépense');
    }
  });

  it('updateExpense returns NotFoundError when update returns no row', async () => {
    const storage = createStorage();
    const expenses = [{ id: 'exp-2', amountInCents: 1200 }];
    mockDb.select.mockImplementation(() => selectBuilder(new Map([[schema.financialExpenses, expenses]])));

    mockDb.update.mockReturnValue({
      set: (_data: unknown) => ({
        where: (_clause: unknown) => ({
          returning: async () => [],
        }),
      }),
    });

    const result = await storage.updateExpense('exp-2', { notes: 'updated' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Dépense non trouvée');
    }
  });

  it('getFinancialCategories filters by type and sorts by type then name', async () => {
    const storage = createStorage();
    const categories = [
      { id: 'c3', type: 'income', name: 'Zeta' },
      { id: 'c1', type: 'income', name: 'Alpha' },
      { id: 'c2', type: 'expense', name: 'Beta' },
    ];
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map([[schema.financialCategories, categories]])),
    );

    const result = await storage.getFinancialCategories('income');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((item) => item.name)).toEqual(['Alpha', 'Zeta']);
    }
  });

  it('updateCategory returns DatabaseError when update throws', async () => {
    const storage = createStorage();
    const categories = [{ id: 'cat-1', type: 'expense', name: 'Ops' }];

    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map([[schema.financialCategories, categories]])),
    );

    mockDb.update.mockReturnValue({
      set: (_data: unknown) => ({
        where: (_clause: unknown) => ({
          returning: async () => {
            throw new Error('category update failed');
          },
        }),
      }),
    });

    const result = await storage.updateCategory('cat-1', { name: 'Ops 2' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('mise à jour de la catégorie');
    }
  });

  it('generateForecasts creates entries with low and high confidence from history', async () => {
    const storage = createStorage();

    const categories = [
      { id: 'inc-sub', type: 'income', name: 'Souscriptions annuelles' },
      { id: 'inc-sp', type: 'income', name: 'Sponsoring partenaires' },
      { id: 'inc-none', type: 'income', name: 'Autres revenus' },
    ];

    const subscriptions = Array.from({ length: 12 }, (_, index) => ({
      amountInCents: 1000 + index,
      createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    }));

    const sponsorships = [
      { amount: 1500, createdAt: new Date('2024-02-01T00:00:00Z').toISOString() },
      { amount: 1700, createdAt: new Date('2024-03-01T00:00:00Z').toISOString() },
    ];

    const dataByTable = new Map<unknown, unknown[]>([
      [schema.memberSubscriptions, subscriptions],
      [schema.eventSponsorships, sponsorships],
      [schema.financialCategories, categories],
    ]);
    mockDb.select.mockImplementation(() => selectBuilder(dataByTable));

    const insertedRows: Array<Record<string, unknown>> = [];
    mockDb.insert.mockImplementation(() => ({
      values: (payload: Record<string, unknown>) => ({
        returning: async () => {
          insertedRows.push(payload);
          return [{ id: `forecast-${insertedRows.length}`, ...payload }];
        },
      }),
    }));

    const result = await storage.generateForecasts('year', 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
    }

    expect(insertedRows).toHaveLength(3);
    expect(insertedRows.find((row) => row.category === 'inc-sub')?.confidence).toBe('high');
    expect(insertedRows.find((row) => row.category === 'inc-sp')?.confidence).toBe('low');
    expect(insertedRows.find((row) => row.category === 'inc-none')?.forecastedAmountInCents).toBe(0);
  });

  it('getFinancialComparison computes percentage deltas and handles zero baseline', async () => {
    const storage = createStorage();

    const subscriptions = [
      { amountInCents: 1000, createdAt: '2024-01-02T00:00:00Z' },
      { amountInCents: 2000, createdAt: '2025-01-03T00:00:00Z' },
    ];
    const sponsorships = [
      { amount: 500, status: 'confirmed', createdAt: '2025-02-01T00:00:00Z' },
    ];
    const expenses = [
      { amountInCents: 600, expenseDate: '2024-02-10T00:00:00Z' },
      { amountInCents: 900, expenseDate: '2025-02-12T00:00:00Z' },
    ];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, sponsorships],
          [schema.financialExpenses, expenses],
        ]),
      ),
    );

    const result = await storage.getFinancialComparison(
      { period: 'year', year: 2024 },
      { period: 'year', year: 2025 },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.period1).toBe(1000);
      expect(result.data.revenues.period2).toBe(2500);
      expect(result.data.revenues.change).toBe(1500);
      expect(result.data.expenses.change).toBe(300);
    }
  });

  it('getFinancialComparison returns DatabaseError when source query throws', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementationOnce(() => {
      throw new Error('comparison source unavailable');
    });

    const result = await storage.getFinancialComparison(
      { period: 'year', year: 2024 },
      { period: 'year', year: 2025 },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('comparaison financière');
    }
  });

  it('getFinancialReport monthly computes totals, variances and next-period confidence', async () => {
    const storage = createStorage();

    const subscriptions = [
      { amountInCents: 2000, createdAt: '2025-03-02T00:00:00Z' },
      { amountInCents: 5000, createdAt: '2025-04-05T00:00:00Z' },
    ];
    const sponsorships = [
      { amount: 900, status: 'confirmed', createdAt: '2025-03-20T00:00:00Z' },
    ];
    const expenses = [
      { amountInCents: 1200, category: 'cat-exp', expenseDate: '2025-03-10T00:00:00Z' },
      { amountInCents: 3000, category: 'cat-exp', expenseDate: '2025-04-10T00:00:00Z' },
    ];
    const categories = [{ id: 'cat-exp', name: 'Dépenses fixes' }];
    const budgets = [{ amountInCents: 1500, category: 'cat-exp', year: 2025, month: 3 }];
    const forecasts = [
      { year: 2025, month: 4, forecastedAmountInCents: 4200, confidence: 'high' },
      { year: 2025, month: 4, forecastedAmountInCents: 300, confidence: 'medium' },
      { year: 2025, month: 3, forecastedAmountInCents: 2500, confidence: 'low' },
    ];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, sponsorships],
          [schema.financialExpenses, expenses],
          [schema.financialCategories, categories],
          [schema.financialBudgets, budgets],
          [schema.financialForecasts, forecasts],
        ]),
      ),
    );

    const result = await storage.getFinancialReport('monthly', 3, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('2025-03');
      expect(result.data.revenues.total).toBe(2900);
      expect(result.data.expenses.total).toBe(1200);
      expect(result.data.budgets.total).toBe(1500);
      expect(result.data.forecasts.nextPeriod).toBe(4500);
      expect(result.data.forecasts.confidence).toBe('high');
    }
  });

  it('getFinancialReport quarterly computes period label and quarter-specific next-period forecast', async () => {
    const storage = createStorage();

    const subscriptions = [
      { amountInCents: 1000, createdAt: '2025-04-01T00:00:00Z' },
      { amountInCents: 2200, createdAt: '2025-05-10T00:00:00Z' },
    ];
    const sponsorships = [
      { amount: 800, status: 'completed', createdAt: '2025-06-15T00:00:00Z' },
    ];
    const expenses = [
      { amountInCents: 900, category: 'cat-exp', expenseDate: '2025-04-12T00:00:00Z' },
      { amountInCents: 700, category: 'cat-exp', expenseDate: '2025-06-22T00:00:00Z' },
    ];
    const categories = [{ id: 'cat-exp', name: 'Charges' }];
    const budgets = [{ amountInCents: 2500, category: 'cat-exp', year: 2025, quarter: 2 }];
    const forecasts = [
      { year: 2025, quarter: 3, forecastedAmountInCents: 6000, confidence: 'high' },
      { year: 2025, quarter: 3, forecastedAmountInCents: 400, confidence: 'low' },
    ];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, sponsorships],
          [schema.financialExpenses, expenses],
          [schema.financialCategories, categories],
          [schema.financialBudgets, budgets],
          [schema.financialForecasts, forecasts],
        ]),
      ),
    );

    const result = await storage.getFinancialReport('quarterly', 2, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('T2 2025');
      expect(result.data.revenues.total).toBe(4000);
      expect(result.data.expenses.total).toBe(1600);
      expect(result.data.forecasts.nextPeriod).toBe(6400);
      expect(result.data.forecasts.confidence).toBe('medium');
    }
  });

  it('getFinancialReport yearly uses next-year forecasts and low confidence when no next entries', async () => {
    const storage = createStorage();

    const subscriptions = [{ amountInCents: 3000, createdAt: '2025-01-02T00:00:00Z' }];
    const sponsorships = [{ amount: 700, status: 'confirmed', createdAt: '2025-02-01T00:00:00Z' }];
    const expenses = [{ amountInCents: 1100, category: 'cat-exp', expenseDate: '2025-03-01T00:00:00Z' }];
    const categories = [{ id: 'cat-exp', name: 'Charges fixes' }];
    const budgets = [{ amountInCents: 1500, category: 'cat-exp', year: 2025 }];
    const forecasts = [{ year: 2025, forecastedAmountInCents: 2800, confidence: 'high' }];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, sponsorships],
          [schema.financialExpenses, expenses],
          [schema.financialCategories, categories],
          [schema.financialBudgets, budgets],
          [schema.financialForecasts, forecasts],
        ]),
      ),
    );

    const result = await storage.getFinancialReport('yearly', 1, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('2025');
      expect(result.data.revenues.total).toBe(3700);
      expect(result.data.expenses.total).toBe(1100);
      expect(result.data.forecasts.nextPeriod).toBe(0);
      expect(result.data.forecasts.confidence).toBe('low');
    }
  });

  it('getFinancialReport monthly handles December rollover to month=1 in next-period selection', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map([
          [schema.memberSubscriptions, [{ amountInCents: 100, createdAt: '2025-12-05T00:00:00Z' }]],
          [schema.eventSponsorships, []],
          [schema.financialExpenses, []],
          [schema.financialCategories, []],
          [schema.financialBudgets, []],
          [schema.financialForecasts, [{ year: 2025, month: 1, forecastedAmountInCents: 777, confidence: 'medium' }]],
        ]),
      ),
    );

    const result = await storage.getFinancialReport('monthly', 12, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.forecasts.nextPeriod).toBe(777);
    }
  });

  it('getFinancialReport quarterly handles Q4 rollover to quarter=1 in next-period selection', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map([
          [schema.memberSubscriptions, []],
          [schema.eventSponsorships, []],
          [schema.financialExpenses, []],
          [schema.financialCategories, []],
          [schema.financialBudgets, []],
          [schema.financialForecasts, [{ year: 2025, quarter: 1, forecastedAmountInCents: 333, confidence: 'low' }]],
        ]),
      ),
    );

    const result = await storage.getFinancialReport('quarterly', 4, 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe('T4 2025');
      expect(result.data.forecasts.nextPeriod).toBe(333);
    }
  });

  it('getFinancialReport returns DatabaseError when expenses query path throws', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementationOnce(() => selectBuilder(new Map([[schema.memberSubscriptions, []]])));
    mockDb.select.mockImplementationOnce(() =>
      selectBuilder(new Map([[schema.eventSponsorships, []]])),
    );
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('expense query crashed');
    });

    const result = await storage.getFinancialReport('monthly', 1, 2025);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('génération du rapport financier');
    }
  });
});
