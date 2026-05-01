import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
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
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
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
        public constructor(_config: unknown) {
          // no-op
        }
      },
  );
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
  delete cjsRequire.cache[storageModulePath];
  const storageModule = cjsRequire(storageModulePath) as StorageModule;
  return new storageModule.DatabaseStorage();
}

describe('server/storage.js - iteration 32 KPI branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getFinancialKPIs computes subscription/sponsorship aggregates including level grouping', async () => {
    const storage = createStorage();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const inTwoYears = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

    const subscriptions = [
      { amountInCents: 1000, startDate: yesterday, endDate: inTwoYears, createdAt: yesterday },
      { amountInCents: 3000, startDate: tenDaysAgo, endDate: inTwoYears, createdAt: tenDaysAgo },
      { amountInCents: 2000, startDate: twoYearsAgo, endDate: yesterday, createdAt: fortyFiveDaysAgo },
    ];

    const sponsorships = [
      { amount: 5000, status: 'confirmed', level: 'gold' },
      { amount: 3000, status: 'completed', level: 'gold' },
      { amount: 2000, status: 'pending', level: 'silver' },
    ];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, sponsorships],
        ]),
      ),
    );

    const result = await storage.getFinancialKPIs();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subscriptions.totalRevenue).toBe(6000);
      expect(result.data.subscriptions.activeSubscriptions).toBe(2);
      expect(result.data.subscriptions.totalSubscriptions).toBe(3);
      expect(result.data.subscriptions.averageAmount).toBe(2000);
      expect(result.data.subscriptions.monthlyRevenue).toBe(4000);

      expect(result.data.sponsorships.totalRevenue).toBe(10000);
      expect(result.data.sponsorships.activeSponsorships).toBe(2);
      expect(result.data.sponsorships.totalSponsorships).toBe(3);
      expect(result.data.sponsorships.averageAmount).toBe(3333);
      expect(result.data.sponsorships.byLevel).toEqual(
        expect.arrayContaining([
          { level: 'gold', count: 2, totalAmount: 8000 },
          { level: 'silver', count: 1, totalAmount: 2000 },
        ]),
      );

      expect(result.data.totalRevenue).toBe(16000);
    }
  });

  it('getFinancialKPIs returns DatabaseError on query failure', async () => {
    const storage = createStorage();
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('financial kpi unavailable');
    });

    const result = await storage.getFinancialKPIs();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('KPIs financiers');
    }
  });

  it('getEngagementKPIs computes member/patron conversions and activity splits', async () => {
    const storage = createStorage();
    const now = Date.now();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString();
    const hundredDaysAgo = new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString();

    const members = [
      { status: 'active', lastActivityAt: tenDaysAgo, engagementScore: 80 },
      { status: 'active', lastActivityAt: hundredDaysAgo, engagementScore: 20 },
      { status: 'proposed', lastActivityAt: fortyDaysAgo, engagementScore: 50 },
    ];

    const patrons = [
      { status: 'active' },
      { status: 'proposed' },
      { status: 'proposed' },
    ];

    const activities = [
      { activityType: 'meeting' },
      { activityType: 'meeting' },
      { activityType: 'event' },
    ];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.members, members],
          [schema.patrons, patrons],
          [schema.memberActivities, activities],
        ]),
      ),
    );

    const result = await storage.getEngagementKPIs();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.members.total).toBe(3);
      expect(result.data.members.active).toBe(2);
      expect(result.data.members.averageScore).toBe(50);
      expect(result.data.members.conversionRate).toBe(67);
      expect(result.data.members.retentionRate).toBe(50);
      expect(result.data.members.churnRate).toBe(50);

      expect(result.data.patrons.total).toBe(3);
      expect(result.data.patrons.active).toBe(1);
      expect(result.data.patrons.conversionRate).toBe(33);

      expect(result.data.activities.total).toBe(3);
      expect(result.data.activities.averagePerMember).toBe(1.5);
      expect(result.data.activities.byType).toEqual(
        expect.arrayContaining([
          { type: 'meeting', count: 2 },
          { type: 'event', count: 1 },
        ]),
      );
    }
  });

  it('getEngagementKPIs handles zero denominators for conversion/retention/churn', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.members, []],
          [schema.patrons, []],
          [schema.memberActivities, []],
        ]),
      ),
    );

    const result = await storage.getEngagementKPIs();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.members.conversionRate).toBe(0);
      expect(result.data.members.retentionRate).toBe(0);
      expect(result.data.members.churnRate).toBe(0);
      expect(result.data.patrons.conversionRate).toBe(0);
      expect(result.data.activities.averagePerMember).toBe(0);
    }
  });

  it('getFinancialKPIsExtended applies yearly filters and variance percentages', async () => {
    const storage = createStorage();

    const subscriptions = [
      { amountInCents: 2000, createdAt: '2025-02-01T00:00:00.000Z' },
      { amountInCents: 1000, createdAt: '2024-02-01T00:00:00.000Z' },
    ];
    const sponsorships = [
      { amount: 3000, createdAt: '2025-03-01T00:00:00.000Z', status: 'confirmed' },
      { amount: 2000, createdAt: '2024-03-01T00:00:00.000Z', status: 'completed' },
    ];
    const forecasts = [
      { year: 2025, forecastedAmountInCents: 8000 },
      { year: 2024, forecastedAmountInCents: 1000 },
    ];
    const expenses = [
      { amountInCents: 1000, expenseDate: '2025-01-15T00:00:00.000Z' },
      { amountInCents: 500, expenseDate: '2024-01-15T00:00:00.000Z' },
    ];
    const budgets = [
      { year: 2025, amountInCents: 1200 },
      { year: 2024, amountInCents: 300 },
    ];

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, subscriptions],
          [schema.eventSponsorships, sponsorships],
          [schema.financialForecasts, forecasts],
          [schema.financialExpenses, expenses],
          [schema.financialBudgets, budgets],
        ]),
      ),
    );

    const result = await storage.getFinancialKPIsExtended('year', 2025);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(5000);
      expect(result.data.revenues.forecasted).toBe(8000);
      expect(result.data.revenues.variance).toBe(-3000);
      expect(result.data.revenues.variancePercent).toBe(-37.5);

      expect(result.data.expenses.actual).toBe(1000);
      expect(result.data.expenses.budgeted).toBe(1200);
      expect(result.data.expenses.variance).toBe(-200);
      expect(result.data.expenses.variancePercent).toBe(-16.67);

      expect(result.data.balance.actual).toBe(4000);
      expect(result.data.balance.forecasted).toBe(6800);
      expect(result.data.balance.variance).toBe(-2800);
      expect(result.data.realizationRate).toBe(62.5);
    }
  });

  it('getFinancialKPIsExtended returns 0 percentages when forecast and budget are zero', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [schema.memberSubscriptions, []],
          [schema.eventSponsorships, []],
          [schema.financialForecasts, []],
          [schema.financialExpenses, []],
          [schema.financialBudgets, []],
        ]),
      ),
    );

    const result = await storage.getFinancialKPIsExtended('year');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.variancePercent).toBe(0);
      expect(result.data.expenses.variancePercent).toBe(0);
      expect(result.data.realizationRate).toBe(0);
    }
  });

  it('getFinancialKPIsExtended returns DatabaseError when a source query fails', async () => {
    const storage = createStorage();
    mockDb.select.mockImplementationOnce(() => ({
      from: () => Promise.reject(new Error('extended kpi query rejected')),
    }));

    const result = await storage.getFinancialKPIsExtended('year', 2025);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('KPIs financiers étendus');
    }
  });
});
