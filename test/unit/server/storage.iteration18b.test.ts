import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type MemberActivityInput = {
  memberEmail: string;
  activityType: string;
  entityType: string;
  entityId?: string;
  scoreImpact: number;
  metadata?: Record<string, unknown>;
};

type MemberActivityRow = {
  id: string;
  memberEmail: string;
  activityType: string;
  entityType: string;
  scoreImpact: number;
  occurredAt: Date;
};

type TxInsertChain<T> = {
  values: (payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type TxUpdateChain = {
  set: (payload: unknown) => {
    where: (criteria: unknown) => Promise<unknown>;
  };
};

type TransactionClient = {
  insert: (_table: unknown) => TxInsertChain<MemberActivityRow>;
  update: (_table: unknown) => TxUpdateChain;
};

type SelectWhereOrderByChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      orderBy: (ordering: unknown) => Promise<T[]>;
    };
  };
};

type SelectOrderByLimitChain<T> = {
  from: (table: unknown) => {
    orderBy: (ordering: unknown) => {
      limit: (count: number) => Promise<T[]>;
    };
  };
};

type DbMock = {
  transaction: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  transaction: vi.fn(),
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
      transaction: mockDb.transaction,
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
          // no-op
        }
      },
  );
}

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

describe('server/storage.js - iteration 18b member activities block', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('trackMemberActivity inserts activity, updates member and returns success', async () => {
    const activityInput: MemberActivityInput = {
      memberEmail: 'member@example.com',
      activityType: 'idea_created',
      entityType: 'idea',
      entityId: 'idea-42',
      scoreImpact: 5,
    };

    const createdActivity: MemberActivityRow = {
      id: 'act-1',
      memberEmail: 'member@example.com',
      activityType: 'idea_created',
      entityType: 'idea',
      scoreImpact: 5,
      occurredAt: new Date('2038-03-01T10:00:00.000Z'),
    };

    const updateWhereMock = vi.fn(async (_criteria: unknown) => ({ rowCount: 1 }));
    const updateSetMock = vi.fn((_payload: unknown) => ({ where: updateWhereMock }));
    const tx: TransactionClient = {
      insert: (_table: unknown) => ({
        values: (_payload: unknown) => ({
          returning: async () => [createdActivity],
        }),
      }),
      update: (_table: unknown) => ({
        set: updateSetMock,
      }),
    };

    mockDb.transaction.mockImplementationOnce(
      async (callback: (trx: TransactionClient) => Promise<MemberActivityRow>) => callback(tx),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.trackMemberActivity(activityInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(createdActivity);
    }
    expect(updateSetMock).toHaveBeenCalledTimes(1);
    expect(updateWhereMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith('Member activity tracked', {
      memberEmail: 'member@example.com',
      activityType: 'idea_created',
      scoreImpact: 5,
      entityType: 'idea',
    });
  });

  it('trackMemberActivity returns DatabaseError when transaction fails', async () => {
    const activityInput: MemberActivityInput = {
      memberEmail: 'member@example.com',
      activityType: 'event_registered',
      entityType: 'event',
      scoreImpact: 2,
    };

    mockDb.transaction.mockRejectedValueOnce(new Error('activity tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.trackMemberActivity(activityInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de l'enregistrement de l'activité");
    }
  });

  it('getMemberActivities returns member activity list on success', async () => {
    const activities: MemberActivityRow[] = [
      {
        id: 'act-2',
        memberEmail: 'member@example.com',
        activityType: 'comment_added',
        entityType: 'idea',
        scoreImpact: 1,
        occurredAt: new Date('2038-04-01T09:00:00.000Z'),
      },
    ];

    mockDb.select.mockImplementationOnce((): SelectWhereOrderByChain<MemberActivityRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => activities,
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getMemberActivities('member@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(activities);
    }
  });

  it('getMemberActivities wraps select failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereOrderByChain<MemberActivityRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => {
            throw new Error('member activities read failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getMemberActivities('member@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des activités du membre');
    }
  });

  it('getAllActivities returns up to 500 activities on success', async () => {
    const activities: MemberActivityRow[] = [
      {
        id: 'act-3',
        memberEmail: 'a@example.com',
        activityType: 'vote_added',
        entityType: 'idea',
        scoreImpact: 1,
        occurredAt: new Date('2038-05-01T08:00:00.000Z'),
      },
    ];

    let capturedLimit = -1;

    mockDb.select.mockImplementationOnce((): SelectOrderByLimitChain<MemberActivityRow> => ({
      from: (_table: unknown) => ({
        orderBy: (_ordering: unknown) => ({
          limit: async (count: number) => {
            capturedLimit = count;
            return activities;
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllActivities();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(activities);
    }
    expect(capturedLimit).toBe(500);
  });

  it('getAllActivities wraps failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce((): SelectOrderByLimitChain<MemberActivityRow> => ({
      from: (_table: unknown) => ({
        orderBy: (_ordering: unknown) => ({
          limit: async (_count: number) => {
            throw new Error('all activities query failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllActivities();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération de toutes les activités');
    }
  });
});
