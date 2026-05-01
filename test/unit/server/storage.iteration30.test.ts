import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

type LoggerMock = {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
};

type CjsCacheModule = {
  id: string;
  filename: string;
  loaded: boolean;
  children: unknown[];
  paths: string[];
  exports: unknown;
};

type BudgetRow = {
  id: string;
  period: string;
  year: number;
  category: string;
  amountInCents: number;
  createdAt: Date;
};

type ExpenseRow = {
  id: string;
  expenseDate: string;
  category: string;
  amountInCents: number;
  budgetId?: string | null;
  createdAt: Date;
};

type ForecastRow = {
  id: string;
  period: string;
  year: number;
  category: string;
  amountInCents: number;
  confidenceLevel: string;
  createdAt: Date;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const loggerMock: LoggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
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
    },
  });

  setCjsModule(loggerModulePath, {
    logger: loggerMock,
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
}

function createStorage(): InstanceType<StorageModule['DatabaseStorage']> {
  delete cjsRequire.cache[storageModulePath];
  const storageModule = cjsRequire(storageModulePath) as StorageModule;
  return new storageModule.DatabaseStorage();
}

describe('server/storage.js - iteration 30 budgets/expenses/forecasts branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getBudgets applies filters and sorts by year then createdAt desc', async () => {
    const storage = createStorage();

    const rows: BudgetRow[] = [
      {
        id: 'b-old',
        period: 'month',
        year: 2025,
        category: 'ops',
        amountInCents: 1000,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
      {
        id: 'b-new',
        period: 'month',
        year: 2025,
        category: 'ops',
        amountInCents: 2000,
        createdAt: new Date('2025-03-01T00:00:00.000Z'),
      },
      {
        id: 'b-other',
        period: 'quarter',
        year: 2024,
        category: 'sales',
        amountInCents: 3000,
        createdAt: new Date('2024-03-01T00:00:00.000Z'),
      },
    ];

    mockDb.select.mockReturnValue({
      from: async (_table: unknown) => rows,
    });

    const result = await storage.getBudgets({
      period: 'month',
      year: 2025,
      category: 'ops',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((row) => row.id)).toEqual(['b-new', 'b-old']);
    }
  });

  it('getBudgetById returns null when budget does not exist', async () => {
    const storage = createStorage();

    mockDb.select.mockReturnValue({
      from: async (_table: unknown) => [],
    });

    const result = await storage.getBudgetById('budget-missing');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('updateBudget returns NotFoundError when update returns no row after existing budget check', async () => {
    const storage = createStorage();

    const existing: BudgetRow[] = [
      {
        id: 'budget-1',
        period: 'month',
        year: 2026,
        category: 'ops',
        amountInCents: 10000,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    mockDb.select.mockReturnValue({
      from: async (_table: unknown) => existing,
    });

    mockDb.update.mockReturnValue({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [],
        }),
      }),
    });

    const result = await storage.updateBudget('budget-1', { amountInCents: 12000 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Budget non trouvé');
    }
  });

  it('deleteBudget wraps delete failure into DatabaseError', async () => {
    const storage = createStorage();

    mockDb.delete.mockReturnValue({
      where: async (_criteria: unknown) => {
        throw new Error('budget delete failed');
      },
    });

    const result = await storage.deleteBudget('budget-err');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('suppression du budget');
    }
  });

  it('getBudgetStats aggregates totals by category and period', async () => {
    const storage = createStorage();

    const rows: BudgetRow[] = [
      {
        id: 'b1',
        period: 'month',
        year: 2026,
        category: 'ops',
        amountInCents: 1000,
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
      },
      {
        id: 'b2',
        period: 'month',
        year: 2026,
        category: 'ops',
        amountInCents: 2000,
        createdAt: new Date('2026-01-20T00:00:00.000Z'),
      },
      {
        id: 'b3',
        period: 'quarter',
        year: 2026,
        category: 'marketing',
        amountInCents: 3000,
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    ];

    mockDb.select.mockReturnValue({
      from: async (_table: unknown) => rows,
    });

    const result = await storage.getBudgetStats(undefined, 2026);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalBudgets).toBe(3);
      expect(result.data.totalAmount).toBe(6000);
      expect(result.data.byCategory).toEqual(
        expect.arrayContaining([
          { category: 'ops', count: 2, totalAmount: 3000 },
          { category: 'marketing', count: 1, totalAmount: 3000 },
        ]),
      );
      expect(result.data.byPeriod).toEqual(
        expect.arrayContaining([
          { period: 'month-2026', count: 2, totalAmount: 3000 },
          { period: 'quarter-2026', count: 1, totalAmount: 3000 },
        ]),
      );
    }
  });

  it('getExpenses filters by category/budget/year and sorts by expenseDate desc', async () => {
    const storage = createStorage();

    const rows: ExpenseRow[] = [
      {
        id: 'e-older',
        expenseDate: '2026-01-10',
        category: 'ops',
        budgetId: 'budget-ops',
        amountInCents: 1000,
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
      },
      {
        id: 'e-newer',
        expenseDate: '2026-02-10',
        category: 'ops',
        budgetId: 'budget-ops',
        amountInCents: 2500,
        createdAt: new Date('2026-02-10T00:00:00.000Z'),
      },
      {
        id: 'e-other',
        expenseDate: '2025-12-10',
        category: 'marketing',
        budgetId: 'budget-mkt',
        amountInCents: 3300,
        createdAt: new Date('2025-12-10T00:00:00.000Z'),
      },
    ];

    mockDb.select.mockReturnValue({
      from: async (_table: unknown) => rows,
    });

    const result = await storage.getExpenses({
      category: 'ops',
      budgetId: 'budget-ops',
      year: 2026,
      period: 'month',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((row) => row.id)).toEqual(['e-newer', 'e-older']);
    }
  });

  it('getExpenseStats groups amounts by category and month key', async () => {
    const storage = createStorage();

    const rows: ExpenseRow[] = [
      {
        id: 'ex-1',
        expenseDate: '2026-01-15',
        category: 'ops',
        amountInCents: 500,
        createdAt: new Date('2026-01-15T00:00:00.000Z'),
      },
      {
        id: 'ex-2',
        expenseDate: '2026-01-30',
        category: 'ops',
        amountInCents: 1500,
        createdAt: new Date('2026-01-30T00:00:00.000Z'),
      },
      {
        id: 'ex-3',
        expenseDate: '2026-02-05',
        category: 'travel',
        amountInCents: 700,
        createdAt: new Date('2026-02-05T00:00:00.000Z'),
      },
      {
        id: 'ex-4',
        expenseDate: '2025-12-10',
        category: 'ops',
        amountInCents: 999,
        createdAt: new Date('2025-12-10T00:00:00.000Z'),
      },
    ];

    mockDb.select.mockReturnValue({
      from: async (_table: unknown) => rows,
    });

    const result = await storage.getExpenseStats('month', 2026);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalExpenses).toBe(3);
      expect(result.data.totalAmount).toBe(2700);
      expect(result.data.byCategory).toEqual(
        expect.arrayContaining([
          { category: 'ops', count: 2, totalAmount: 2000 },
          { category: 'travel', count: 1, totalAmount: 700 },
        ]),
      );
      expect(result.data.byPeriod).toEqual(
        expect.arrayContaining([
          { period: '2026-01', count: 2, totalAmount: 2000 },
          { period: '2026-02', count: 1, totalAmount: 700 },
        ]),
      );
    }
  });

  it('updateForecast returns NotFoundError when update returns no row', async () => {
    const storage = createStorage();

    const rows: ForecastRow[] = [
      {
        id: 'f-1',
        period: 'month',
        year: 2026,
        category: 'ops',
        amountInCents: 10000,
        confidenceLevel: 'medium',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    mockDb.select.mockReturnValue({
      from: async (_table: unknown) => rows,
    });

    mockDb.update.mockReturnValue({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [],
        }),
      }),
    });

    const result = await storage.updateForecast('f-1', { amountInCents: 11111 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Prévision non trouvée');
    }
  });

  it('createForecast wraps insertion failure into DatabaseError', async () => {
    const storage = createStorage();

    mockDb.insert.mockReturnValue({
      values: (_payload: unknown) => ({
        returning: async () => {
          throw new Error('forecast insert failed');
        },
      }),
    });

    const result = await storage.createForecast({
      period: 'month',
      year: 2026,
      category: 'ops',
      amountInCents: 10000,
      confidenceLevel: 'high',
      notes: 'plan',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('création de la prévision');
    }
  });
});
