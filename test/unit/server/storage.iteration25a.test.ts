import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type MemberRow = {
  email: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  status?: string;
  updatedAt?: Date;
};

type MembersCountRow = {
  count: number;
};

type CountQuery = PromiseLike<MembersCountRow[]> & {
  where: (criteria: unknown) => Promise<MembersCountRow[]>;
};

type MembersQuery = PromiseLike<MemberRow[]> & {
  orderBy: (ordering: unknown) => MembersQuery;
  limit: (value: number) => MembersQuery;
  offset: (value: number) => MembersQuery;
  where: (criteria: unknown) => Promise<MemberRow[]>;
};

type SelectFromCountChain = {
  from: (table: unknown) => CountQuery;
};

type SelectFromMembersChain = {
  from: (table: unknown) => MembersQuery;
};

type UpdateReturningChain = {
  returning: () => Promise<MemberRow[]>;
};

type UpdateWhereChain = {
  where: (criteria: unknown) => UpdateReturningChain;
};

type UpdateSetChain = {
  set: (payload: unknown) => UpdateWhereChain;
};

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  select: vi.fn(),
  update: vi.fn(),
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
      update: mockDb.update,
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

function createCountQuery(defaultRows: MembersCountRow[], whereRows: MembersCountRow[]): CountQuery {
  return {
    where: async (_criteria: unknown) => whereRows,
    then: <TResult1 = MembersCountRow[], TResult2 = never>(
      onfulfilled?: ((value: MembersCountRow[]) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve(defaultRows).then(onfulfilled, onrejected),
  };
}

function createMembersQuery(defaultRows: MemberRow[], whereRows: MemberRow[]): MembersQuery {
  const query: MembersQuery = {
    orderBy: (_ordering: unknown) => query,
    limit: (_value: number) => query,
    offset: (_value: number) => query,
    where: async (_criteria: unknown) => whereRows,
    then: <TResult1 = MemberRow[], TResult2 = never>(
      onfulfilled?: ((value: MemberRow[]) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve(defaultRows).then(onfulfilled, onrejected),
  };
  return query;
}

describe('server/storage.js - iteration 25a members list/update branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getMembers returns default paginated payload and clamps page/limit', async () => {
    const countRows: MembersCountRow[] = [{ count: 2 }];
    const membersRows: MemberRow[] = [
      { email: 'a@komuno.test', firstName: 'A', lastName: 'One', status: 'active' },
      { email: 'b@komuno.test', firstName: 'B', lastName: 'Two', status: 'proposed' },
    ];

    mockDb.select
      .mockImplementationOnce((_projection?: unknown): SelectFromCountChain => ({
        from: (_table: unknown) => createCountQuery(countRows, countRows),
      }))
      .mockImplementationOnce((_projection?: unknown): SelectFromMembersChain => ({
        from: (_table: unknown) => createMembersQuery(membersRows, membersRows),
      }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getMembers({ page: 0, limit: 500 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        data: membersRows,
        total: 2,
        page: 1,
        limit: 100,
      });
    }
  });

  it('getMembers uses filtered where path when status/search/score/activity filters are provided', async () => {
    const filteredCountRows: MembersCountRow[] = [{ count: 1 }];
    const filteredMembersRows: MemberRow[] = [
      { email: 'filtered@komuno.test', firstName: 'Filtered', lastName: 'Member', status: 'active' },
    ];

    const countWhereSpy = vi.fn(async (_criteria: unknown) => filteredCountRows);
    const membersWhereSpy = vi.fn(async (_criteria: unknown) => filteredMembersRows);

    const countQuery: CountQuery = {
      where: countWhereSpy,
      then: <TResult1 = MembersCountRow[], TResult2 = never>(
        onfulfilled?: ((value: MembersCountRow[]) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => Promise.resolve([{ count: 999 }]).then(onfulfilled, onrejected),
    };

    const membersQuery: MembersQuery = {
      orderBy: (_ordering: unknown) => membersQuery,
      limit: (_value: number) => membersQuery,
      offset: (_value: number) => membersQuery,
      where: membersWhereSpy,
      then: <TResult1 = MemberRow[], TResult2 = never>(
        onfulfilled?: ((value: MemberRow[]) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => Promise.resolve([] as MemberRow[]).then(onfulfilled, onrejected),
    };

    mockDb.select
      .mockImplementationOnce((_projection?: unknown): SelectFromCountChain => ({
        from: (_table: unknown) => countQuery,
      }))
      .mockImplementationOnce((_projection?: unknown): SelectFromMembersChain => ({
        from: (_table: unknown) => membersQuery,
      }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getMembers({
      page: 2,
      limit: 0,
      status: 'active',
      search: '  Dupont  ',
      score: 'medium',
      activity: 'inactive',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        data: filteredMembersRows,
        total: 1,
        page: 2,
        limit: 20,
      });
    }
    expect(countWhereSpy).toHaveBeenCalledTimes(1);
    expect(membersWhereSpy).toHaveBeenCalledTimes(1);
  });

  it('getMembers returns DatabaseError when select/count fails', async () => {
    mockDb.select.mockImplementationOnce((_projection?: unknown): SelectFromCountChain => ({
      from: (_table: unknown) => {
        throw new Error('count query exploded');
      },
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getMembers({ page: 1, limit: 20 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('récupération des membres');
    }
  });

  it('updateMember returns updated member and logs updated fields', async () => {
    const existingMember: MemberRow = {
      email: 'update@komuno.test',
      firstName: 'Old',
      lastName: 'Name',
    };

    const updatedMember: MemberRow = {
      email: 'update@komuno.test',
      firstName: 'New',
      lastName: 'Name',
      company: 'Komuno',
    };

    mockDb.select.mockImplementationOnce((_projection?: unknown): SelectFromMembersChain => ({
      from: (_table: unknown) => ({
        orderBy: (_ordering: unknown) => createMembersQuery([], []),
        limit: (_value: number) => createMembersQuery([], []),
        offset: (_value: number) => createMembersQuery([], []),
        where: async (_criteria: unknown) => [existingMember],
        then: <TResult1 = MemberRow[], TResult2 = never>(
          onfulfilled?: ((value: MemberRow[]) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) => Promise.resolve([] as MemberRow[]).then(onfulfilled, onrejected),
      }),
    }));

    let capturedSetPayload: unknown;
    mockDb.update.mockImplementationOnce((_table: unknown): UpdateSetChain => ({
      set: (payload: unknown) => {
        capturedSetPayload = payload;
        return {
          where: (_criteria: unknown) => ({
            returning: async () => [updatedMember],
          }),
        };
      },
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateMember('update@komuno.test', {
      firstName: 'New',
      company: 'Komuno',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedMember);
    }
    const setPayload = capturedSetPayload as Record<string, unknown>;
    expect(setPayload.firstName).toBe('New');
    expect(setPayload.company).toBe('Komuno');
    expect(setPayload.updatedAt).toBeDefined();
    expect(loggerMock.info).toHaveBeenCalledWith('Member updated', {
      email: 'update@komuno.test',
      updates: ['firstName', 'company'],
    });
  });

  it('updateMember returns NotFoundError when member does not exist', async () => {
    mockDb.select.mockImplementationOnce((_projection?: unknown): SelectFromMembersChain => ({
      from: (_table: unknown) => ({
        orderBy: (_ordering: unknown) => createMembersQuery([], []),
        limit: (_value: number) => createMembersQuery([], []),
        offset: (_value: number) => createMembersQuery([], []),
        where: async (_criteria: unknown) => [],
        then: <TResult1 = MemberRow[], TResult2 = never>(
          onfulfilled?: ((value: MemberRow[]) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) => Promise.resolve([] as MemberRow[]).then(onfulfilled, onrejected),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateMember('missing@komuno.test', {
      firstName: 'Nobody',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Membre introuvable');
    }
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('updateMember returns DatabaseError when select fails', async () => {
    mockDb.select.mockImplementationOnce((_projection?: unknown): SelectFromMembersChain => ({
      from: (_table: unknown) => ({
        orderBy: (_ordering: unknown) => createMembersQuery([], []),
        limit: (_value: number) => createMembersQuery([], []),
        offset: (_value: number) => createMembersQuery([], []),
        where: async (_criteria: unknown) => {
          throw new Error('member lookup failed');
        },
        then: <TResult1 = MemberRow[], TResult2 = never>(
          onfulfilled?: ((value: MemberRow[]) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) => Promise.resolve([] as MemberRow[]).then(onfulfilled, onrejected),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateMember('error@komuno.test', {
      role: 'member',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('mise à jour du membre');
    }
  });

  it('updateMember returns DatabaseError when update query throws', async () => {
    const existingMember: MemberRow = {
      email: 'update-error@komuno.test',
      firstName: 'Err',
      lastName: 'Or',
    };

    mockDb.select.mockImplementationOnce((_projection?: unknown): SelectFromMembersChain => ({
      from: (_table: unknown) => ({
        orderBy: (_ordering: unknown) => createMembersQuery([], []),
        limit: (_value: number) => createMembersQuery([], []),
        offset: (_value: number) => createMembersQuery([], []),
        where: async (_criteria: unknown) => [existingMember],
        then: <TResult1 = MemberRow[], TResult2 = never>(
          onfulfilled?: ((value: MemberRow[]) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) => Promise.resolve([] as MemberRow[]).then(onfulfilled, onrejected),
      }),
    }));

    mockDb.update.mockImplementationOnce((_table: unknown): UpdateSetChain => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => {
            throw new Error('update statement failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateMember('update-error@komuno.test', {
      company: 'Broken Inc',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('mise à jour du membre');
    }
  });
});
