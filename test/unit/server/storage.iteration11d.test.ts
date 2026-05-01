import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

type SponsorshipRow = {
  id: string;
  amount: number;
  level: string;
  status: string;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  select: vi.fn(),
  transaction: vi.fn(),
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
      transaction: mockDb.transaction,
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

function setupSelectSequence(sequence: unknown[]): void {
  let index = 0;
  mockDb.select.mockImplementation(() => ({
    from: vi.fn(async () => {
      const current = sequence[index];
      index += 1;
      return current;
    }),
  }));
}

function setupSelectFailure(error: Error): void {
  mockDb.select.mockImplementation(() => ({
    from: vi.fn(async () => {
      throw error;
    }),
  }));
}

describe('server/storage.js - iteration 11d admin/logs/stats coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getStats returns aggregated counters on success', async () => {
    setupSelectSequence([
      [{ count: 7 }],
      [{ count: 42 }],
      [{ count: 3 }],
      [{ count: 19 }],
    ]);

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        totalIdeas: 7,
        totalVotes: 42,
        upcomingEvents: 3,
        totalInscriptions: 19,
      });
    }
    expect(mockDb.select).toHaveBeenCalledTimes(4);
  });

  it('getStats returns DatabaseError on query failure', async () => {
    setupSelectFailure(new Error('stats query failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getStats();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des statistiques');
    }
  });

  it('getAdminStats returns consolidated admin counters on success', async () => {
    setupSelectSequence([
      [{ total: 100, active: 80, proposed: 20, recentActivity: 65 }],
      [{ total: 50, active: 35, proposed: 15 }],
      [{ total: 70, pending: 12, approved: 33 }],
      [{ total: 11, upcoming: 4 }],
    ]);

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAdminStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        members: {
          total: 100,
          active: 80,
          proposed: 20,
          recentActivity: 65,
        },
        patrons: {
          total: 50,
          active: 35,
          proposed: 15,
        },
        ideas: {
          total: 70,
          pending: 12,
          approved: 33,
        },
        events: {
          total: 11,
          upcoming: 4,
        },
      });
    }
    expect(mockDb.select).toHaveBeenCalledTimes(4);
  });

  it('getAdminStats returns DatabaseError when select throws', async () => {
    setupSelectFailure(new Error('admin stats failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAdminStats();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des statistiques admin');
    }
  });

  it('getSponsorshipStats computes totals/groups and logs debug on success', async () => {
    const rows: SponsorshipRow[] = [
      { id: 'sp-1', amount: 5000, level: 'gold', status: 'confirmed' },
      { id: 'sp-2', amount: 3000, level: 'silver', status: 'pending' },
      { id: 'sp-3', amount: 2000, level: 'gold', status: 'completed' },
    ];

    setupSelectSequence([rows]);

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getSponsorshipStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalSponsorships).toBe(3);
      expect(result.data.totalAmount).toBe(10000);
      expect(result.data.sponsorshipsByLevel).toEqual(
        expect.arrayContaining([
          { level: 'gold', count: 2, totalAmount: 7000 },
          { level: 'silver', count: 1, totalAmount: 3000 },
        ]),
      );
      expect(result.data.sponsorshipsByStatus).toEqual(
        expect.arrayContaining([
          { status: 'confirmed', count: 1 },
          { status: 'pending', count: 1 },
          { status: 'completed', count: 1 },
        ]),
      );
    }
    expect(loggerMock.debug).toHaveBeenCalledWith('Sponsorship stats calculated', {
      totalSponsorships: 3,
      totalAmount: 10000,
    });
  });

  it('getSponsorshipStats returns DatabaseError on select failure', async () => {
    setupSelectFailure(new Error('sponsorship stats failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getSponsorshipStats();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors du calcul des statistiques de sponsoring');
    }
  });
});

