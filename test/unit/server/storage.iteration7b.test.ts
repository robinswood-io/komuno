import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type VoteRow = {
  id: string;
  ideaId: string;
  voterEmail: string;
};

type SelectWhereOrderByChain = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      orderBy: (ordering: unknown) => Promise<VoteRow[]>;
    };
  };
};

type SelectWhereDirectChain = {
  from: (table: unknown) => {
    where: (criteria: unknown) => Promise<VoteRow[]>;
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
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
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

describe('server/storage.js - iteration 7b votes coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getVotesByIdea returns success payload when select succeeds', async () => {
    const votes: VoteRow[] = [
      { id: 'v-1', ideaId: 'idea-10', voterEmail: 'a@example.com' },
      { id: 'v-2', ideaId: 'idea-10', voterEmail: 'b@example.com' },
    ];

    mockDb.select.mockImplementation((): SelectWhereOrderByChain => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => votes,
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getVotesByIdea('idea-10');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(votes);
    }
  });

  it('getVotesByIdea wraps select failures into DatabaseError', async () => {
    mockDb.select.mockImplementation((): SelectWhereOrderByChain => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => {
            throw new Error('votes select failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getVotesByIdea('idea-err');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des votes');
    }
  });

  it('getIdeaVotes returns success payload when select succeeds', async () => {
    const votes: VoteRow[] = [{ id: 'v-3', ideaId: 'idea-20', voterEmail: 'c@example.com' }];

    mockDb.select.mockImplementation((): SelectWhereOrderByChain => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => votes,
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getIdeaVotes('idea-20');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(votes);
    }
  });

  it('getIdeaVotes wraps select failures into DatabaseError', async () => {
    mockDb.select.mockImplementation((): SelectWhereOrderByChain => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => {
            throw new Error('idea votes select failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getIdeaVotes('idea-err-2');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des votes');
    }
  });

  it('hasUserVoted returns true when vote exists', async () => {
    mockDb.select.mockImplementation((): SelectWhereDirectChain => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          { id: 'v-4', ideaId: 'idea-30', voterEmail: 'present@example.com' },
        ],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.hasUserVoted('idea-30', 'present@example.com');

    expect(result).toBe(true);
  });

  it('hasUserVoted returns false when no vote exists', async () => {
    mockDb.select.mockImplementation((): SelectWhereDirectChain => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.hasUserVoted('idea-31', 'absent@example.com');

    expect(result).toBe(false);
  });
});
