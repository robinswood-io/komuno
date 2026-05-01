import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type MemberRow = {
  status: 'proposed' | 'active';
  engagementScore: number;
  lastActivityAt: Date | null;
  firstSeenAt: Date | null;
};

type PatronRow = {
  status: 'proposed' | 'active';
  createdAt: Date | null;
  updatedAt: Date | null;
};

type TrackingMetricRow = {
  entityType: 'member' | 'patron';
  recordedAt?: Date;
};

type TrackingWhereResult = PromiseLike<TrackingMetricRow[]> & {
  orderBy: (_ordering: unknown) => {
    limit: (_count: number) => Promise<TrackingMetricRow[]>;
  };
};

type DbMock = {
  select: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  select: vi.fn(),
};

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
    runDbQuery: vi.fn(),
    getPoolStats: vi.fn(),
    db: {
      select: mockDb.select,
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
        constructor(_config: unknown) {
          // No-op
        }
      },
  );
}

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

function createWhereResult(
  awaitedMetrics: TrackingMetricRow[],
  limitedMetrics?: TrackingMetricRow[],
): TrackingWhereResult {
  const limitData = limitedMetrics ?? awaitedMetrics;
  return {
    orderBy: (_ordering: unknown) => ({
      limit: async (_count: number) => limitData,
    }),
    then: <TResult1 = TrackingMetricRow[], TResult2 = never>(
      onfulfilled?: ((value: TrackingMetricRow[]) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve(awaitedMetrics).then(onfulfilled, onrejected),
  };
}

describe('server/storage.js - iteration 22a tracking dashboard success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T12:00:00.000Z'));
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('getTrackingDashboard returns expected counters, conversion rates and 7-day trends', async () => {
    const members: MemberRow[] = [
      {
        status: 'proposed',
        engagementScore: 10,
        lastActivityAt: new Date('2026-04-20T08:00:00.000Z'),
        firstSeenAt: new Date('2026-04-01T10:00:00.000Z'),
      },
      {
        status: 'active',
        engagementScore: 25,
        lastActivityAt: new Date('2026-04-10T08:00:00.000Z'),
        firstSeenAt: new Date('2026-02-01T10:00:00.000Z'),
      },
      {
        status: 'active',
        engagementScore: 5,
        lastActivityAt: new Date('2025-12-01T08:00:00.000Z'),
        firstSeenAt: new Date('2025-01-01T10:00:00.000Z'),
      },
      {
        status: 'active',
        engagementScore: 40,
        lastActivityAt: null,
        firstSeenAt: new Date('2026-04-01T09:00:00.000Z'),
      },
    ];

    const patrons: PatronRow[] = [
      {
        status: 'proposed',
        createdAt: new Date('2026-04-15T08:00:00.000Z'),
        updatedAt: new Date('2026-04-16T08:00:00.000Z'),
      },
      {
        status: 'proposed',
        createdAt: new Date('2026-02-01T08:00:00.000Z'),
        updatedAt: new Date('2026-02-02T08:00:00.000Z'),
      },
      {
        status: 'active',
        createdAt: new Date('2025-01-01T08:00:00.000Z'),
        updatedAt: new Date('2025-12-15T08:00:00.000Z'),
      },
      {
        status: 'active',
        createdAt: new Date('2026-04-01T08:00:00.000Z'),
        updatedAt: new Date('2026-04-20T08:00:00.000Z'),
      },
    ];

    const recentMetrics: TrackingMetricRow[] = [
      { entityType: 'member', recordedAt: new Date('2026-04-30T07:00:00.000Z') },
      { entityType: 'patron', recordedAt: new Date('2026-04-29T07:00:00.000Z') },
    ];

    const dailyMetrics: TrackingMetricRow[][] = [
      [{ entityType: 'member' }],
      [{ entityType: 'patron' }, { entityType: 'patron' }],
      [],
      [{ entityType: 'member' }, { entityType: 'patron' }],
      [{ entityType: 'member' }, { entityType: 'member' }, { entityType: 'member' }],
      [{ entityType: 'patron' }],
      [{ entityType: 'member' }, { entityType: 'patron' }, { entityType: 'patron' }],
    ];

    let selectCallIndex = 0;
    let trackingWhereCallIndex = 0;

    mockDb.select.mockImplementation(() => {
      const currentSelectCall = selectCallIndex;
      selectCallIndex += 1;

      if (currentSelectCall === 0) {
        return {
          from: async (_table: unknown) => members,
        };
      }

      if (currentSelectCall === 1) {
        return {
          from: async (_table: unknown) => patrons,
        };
      }

      return {
        from: (_table: unknown) => ({
          where: (_criteria: unknown) => {
            const currentWhereCall = trackingWhereCallIndex;
            trackingWhereCallIndex += 1;

            if (currentWhereCall === 0) {
              return createWhereResult([], recentMetrics);
            }

            return createWhereResult(dailyMetrics[currentWhereCall - 1] ?? []);
          },
        }),
      };
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingDashboard();

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.members).toEqual({
      total: 4,
      proposed: 1,
      active: 3,
      highPotential: 2,
      stale: 1,
    });

    expect(result.data.patrons).toEqual({
      total: 4,
      proposed: 2,
      active: 2,
      highPotential: 1,
      stale: 1,
    });

    expect(result.data.conversionRate).toEqual({
      members: 75,
      patrons: 50,
    });

    expect(result.data.recentActivity).toHaveLength(2);
    expect(result.data.engagementTrends).toHaveLength(7);

    expect(result.data.engagementTrends[0]).toEqual({
      date: '2026-04-24',
      members: 1,
      patrons: 0,
    });

    expect(result.data.engagementTrends[6]).toEqual({
      date: '2026-04-30',
      members: 1,
      patrons: 2,
    });

    expect(mockDb.select).toHaveBeenCalledTimes(10);
  });
});
