import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type MemberSubscriptionRow = {
  id: string;
  memberEmail: string;
  plan: string;
  startDate: Date;
  active: boolean;
};

type MemberSubscriptionInput = {
  memberEmail: string;
  plan: string;
  startDate: Date;
  active: boolean;
};

type InsertChain<T> = {
  values: (payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type QueryMock = {
  memberSubscriptions: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

type DbMock = {
  insert: ReturnType<typeof vi.fn>;
  query: QueryMock;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const queryMock: QueryMock = {
  memberSubscriptions: {
    findMany: vi.fn(),
  },
};

const mockDb: DbMock = {
  insert: vi.fn(),
  query: queryMock,
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
      insert: mockDb.insert,
      query: mockDb.query,
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

describe('server/storage.js - iteration 17b member subscriptions methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getSubscriptionsByMember returns list from query layer', async () => {
    const subscriptions: MemberSubscriptionRow[] = [
      {
        id: 'sub-2',
        memberEmail: 'member@example.com',
        plan: 'gold',
        startDate: new Date('2035-05-02T00:00:00.000Z'),
        active: true,
      },
      {
        id: 'sub-1',
        memberEmail: 'member@example.com',
        plan: 'silver',
        startDate: new Date('2035-01-02T00:00:00.000Z'),
        active: false,
      },
    ];

    queryMock.memberSubscriptions.findMany.mockResolvedValueOnce(subscriptions);

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getSubscriptionsByMember('member@example.com');

    expect(result).toEqual(subscriptions);
    expect(queryMock.memberSubscriptions.findMany).toHaveBeenCalledTimes(1);
    expect(queryMock.memberSubscriptions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything(),
        orderBy: expect.any(Array),
      }),
    );
  });

  it('getSubscriptionsByMember propagates query errors', async () => {
    queryMock.memberSubscriptions.findMany.mockRejectedValueOnce(new Error('subscriptions query failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    await expect(storage.getSubscriptionsByMember('member@example.com')).rejects.toThrow(
      'subscriptions query failed',
    );
  });

  it('createSubscription inserts and returns first created row', async () => {
    const created: MemberSubscriptionRow = {
      id: 'sub-3',
      memberEmail: 'new@example.com',
      plan: 'premium',
      startDate: new Date('2036-06-01T00:00:00.000Z'),
      active: true,
    };

    mockDb.insert.mockImplementationOnce((_table: unknown): InsertChain<MemberSubscriptionRow> => ({
      values: (_payload: unknown) => ({
        returning: async () => [created],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const input: MemberSubscriptionInput = {
      memberEmail: 'new@example.com',
      plan: 'premium',
      startDate: new Date('2036-06-01T00:00:00.000Z'),
      active: true,
    };

    const result = await storage.createSubscription(input);

    expect(result).toEqual(created);
  });

  it('createSubscription propagates insertion failures', async () => {
    mockDb.insert.mockImplementationOnce((_table: unknown): InsertChain<MemberSubscriptionRow> => ({
      values: (_payload: unknown) => ({
        returning: async () => {
          throw new Error('subscription insert failed');
        },
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const input: MemberSubscriptionInput = {
      memberEmail: 'err@example.com',
      plan: 'basic',
      startDate: new Date('2036-07-01T00:00:00.000Z'),
      active: false,
    };

    await expect(storage.createSubscription(input)).rejects.toThrow('subscription insert failed');
  });
});
