import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type EmailConfigRow = {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  updatedBy: string;
};

type EmailConfigInput = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
};

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

type TxSelectLimitChain = {
  from: (_table: unknown) => {
    limit: (_count: number) => Promise<EmailConfigRow[]>;
  };
};

type TxUpdateChain = {
  set: (_payload: unknown) => {
    where: (_criteria: unknown) => {
      returning: () => Promise<EmailConfigRow[]>;
    };
  };
};

type TxInsertChain = {
  values: (_payload: unknown) => {
    returning: () => Promise<EmailConfigRow[]>;
  };
};

type TxMock = {
  select: () => TxSelectLimitChain;
  update: (_table: unknown) => TxUpdateChain;
  insert: (_table: unknown) => TxInsertChain;
};

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
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
          // no-op
        }
      },
  );
}

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

describe('server/storage.js - iteration 24c email config + dashboard edge branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
    runDbQueryMock.mockImplementation(async (queryFn: () => Promise<unknown>) => queryFn());
  });

  it('getEmailConfig returns the first row when multiple rows are returned', async () => {
    const first: EmailConfigRow = {
      id: 'ecfg-1',
      smtpHost: 'smtp.first.local',
      smtpPort: 587,
      smtpUser: 'first',
      smtpPass: 'first-pass',
      fromEmail: 'first@example.com',
      fromName: 'First',
      updatedBy: 'admin-1',
    };

    const second: EmailConfigRow = {
      id: 'ecfg-2',
      smtpHost: 'smtp.second.local',
      smtpPort: 465,
      smtpUser: 'second',
      smtpPass: 'second-pass',
      fromEmail: 'second@example.com',
      fromName: 'Second',
      updatedBy: 'admin-2',
    };

    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        limit: async (_count: number) => [first, second],
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getEmailConfig();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(first);
    }
    expect(runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'quick');
  });

  it('updateEmailConfig update branch succeeds and does not call insert', async () => {
    const existing: EmailConfigRow = {
      id: 'ecfg-existing',
      smtpHost: 'old.smtp.local',
      smtpPort: 25,
      smtpUser: 'old',
      smtpPass: 'old-pass',
      fromEmail: 'old@example.com',
      fromName: 'Old',
      updatedBy: 'old-admin',
    };

    const updated: EmailConfigRow = {
      id: 'ecfg-existing',
      smtpHost: 'new.smtp.local',
      smtpPort: 2525,
      smtpUser: 'new',
      smtpPass: 'new-pass',
      fromEmail: 'new@example.com',
      fromName: 'New',
      updatedBy: 'admin@example.com',
    };

    const insertSpy = vi.fn((_table: unknown): TxInsertChain => ({
      values: (_payload: unknown) => ({
        returning: async () => [updated],
      }),
    }));

    const txMock: TxMock = {
      select: () => ({
        from: (_table: unknown) => ({
          limit: async (_count: number) => [existing],
        }),
      }),
      update: (_table: unknown) => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => [updated],
          }),
        }),
      }),
      insert: insertSpy,
    };

    mockDb.transaction.mockImplementationOnce(
      async (callback: (tx: TxMock) => Promise<EmailConfigRow>) => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const input: EmailConfigInput = {
      smtpHost: 'new.smtp.local',
      smtpPort: 2525,
      smtpUser: 'new',
      smtpPass: 'new-pass',
      fromEmail: 'new@example.com',
      fromName: 'New',
    };

    const result = await storage.updateEmailConfig(input, 'admin@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updated);
    }
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('updateEmailConfig insert branch succeeds and does not call update', async () => {
    const inserted: EmailConfigRow = {
      id: 'ecfg-new',
      smtpHost: 'smtp.insert.local',
      smtpPort: 1025,
      smtpUser: 'insert',
      smtpPass: 'insert-pass',
      fromEmail: 'insert@example.com',
      fromName: 'Insert',
      updatedBy: 'owner@example.com',
    };

    const updateSpy = vi.fn((_table: unknown): TxUpdateChain => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [inserted],
        }),
      }),
    }));

    const txMock: TxMock = {
      select: () => ({
        from: (_table: unknown) => ({
          limit: async (_count: number) => [],
        }),
      }),
      update: updateSpy,
      insert: (_table: unknown) => ({
        values: (_payload: unknown) => ({
          returning: async () => [inserted],
        }),
      }),
    };

    mockDb.transaction.mockImplementationOnce(
      async (callback: (tx: TxMock) => Promise<EmailConfigRow>) => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const input: EmailConfigInput = {
      smtpHost: 'smtp.insert.local',
      smtpPort: 1025,
      smtpUser: 'insert',
      smtpPass: 'insert-pass',
      fromEmail: 'insert@example.com',
      fromName: 'Insert',
    };

    const result = await storage.updateEmailConfig(input, 'owner@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(inserted);
    }
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('getTrackingDashboard returns DatabaseError when patrons query (2nd select) throws', async () => {
    const members: MemberRow[] = [];

    let callIndex = 0;
    mockDb.select.mockImplementation(() => {
      const current = callIndex;
      callIndex += 1;

      if (current === 0) {
        return {
          from: async (_table: unknown) => members,
        };
      }

      throw new Error('patrons query failed');
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingDashboard();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération du dashboard');
      expect(result.error.message).toContain('patrons query failed');
    }
  });

  it('getTrackingDashboard returns DatabaseError when recent activity where-chain throws', async () => {
    const members: MemberRow[] = [];
    const patrons: PatronRow[] = [];

    let callIndex = 0;
    mockDb.select.mockImplementation(() => {
      const current = callIndex;
      callIndex += 1;

      if (current === 0) {
        return {
          from: async (_table: unknown) => members,
        };
      }

      if (current === 1) {
        return {
          from: async (_table: unknown) => patrons,
        };
      }

      return {
        from: (_table: unknown) => ({
          where: (_criteria: unknown) => {
            throw new Error('recent metrics where failed');
          },
        }),
      };
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingDashboard();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération du dashboard');
    }
  });

  it('getTrackingDashboard returns DatabaseError when a daily trend query throws inside loop', async () => {
    const members: MemberRow[] = [];
    const patrons: PatronRow[] = [];
    const recentMetrics: TrackingMetricRow[] = [];

    let callIndex = 0;
    let whereIndex = 0;

    mockDb.select.mockImplementation(() => {
      const current = callIndex;
      callIndex += 1;

      if (current === 0) {
        return {
          from: async (_table: unknown) => members,
        };
      }

      if (current === 1) {
        return {
          from: async (_table: unknown) => patrons,
        };
      }

      return {
        from: (_table: unknown) => ({
          where: (_criteria: unknown) => {
            const localWhere = whereIndex;
            whereIndex += 1;

            if (localWhere === 0) {
              return {
                orderBy: (_ordering: unknown) => ({
                  limit: async (_count: number) => recentMetrics,
                }),
                then: <TResult1 = TrackingMetricRow[], TResult2 = never>(
                  onfulfilled?: ((value: TrackingMetricRow[]) => TResult1 | PromiseLike<TResult1>) | null,
                  onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
                ) => Promise.resolve([] as TrackingMetricRow[]).then(onfulfilled, onrejected),
              };
            }

            if (localWhere === 1) {
              throw new Error('daily trend where failed');
            }

            return {
              orderBy: (_ordering: unknown) => ({
                limit: async (_count: number) => [],
              }),
              then: <TResult1 = TrackingMetricRow[], TResult2 = never>(
                onfulfilled?: ((value: TrackingMetricRow[]) => TResult1 | PromiseLike<TResult1>) | null,
                onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
              ) => Promise.resolve([] as TrackingMetricRow[]).then(onfulfilled, onrejected),
            };
          },
        }),
      };
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingDashboard();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération du dashboard');
    }
  });
});
