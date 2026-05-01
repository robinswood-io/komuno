import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type VoteRow = {
  id: string;
  ideaId: string;
  voterEmail: string;
  voterName?: string;
};

type IdeaRow = {
  id: string;
  title: string;
};

type SelectWhereChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => Promise<T[]>;
  };
};

type TxInsertChain = {
  values: (payload: unknown) => {
    returning: () => Promise<VoteRow[]>;
  };
};

type TxDeleteChain = {
  where: (criteria: unknown) => Promise<unknown>;
};

type TxMock = {
  insert: (table: unknown) => TxInsertChain;
  delete: (table: unknown) => TxDeleteChain;
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

describe('server/storage.js - iteration 9a votes branches coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('createVote returns DuplicateError when same voter already voted', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<VoteRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            id: 'vote-dup',
            ideaId: 'idea-1',
            voterEmail: 'dup@example.com',
          },
        ],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const getIdeaSpy = vi.spyOn(storage, 'getIdea');

    const result = await storage.createVote({
      ideaId: 'idea-1',
      voterEmail: 'dup@example.com',
      voterName: 'Dup Voter',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('déjà voté pour cette idée');
    }
    expect(getIdeaSpy).not.toHaveBeenCalled();
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('createVote propagates getIdea failure', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<VoteRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const upstreamError = new Error('getIdea failed upstream');

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: false,
      error: upstreamError,
    });

    const result = await storage.createVote({
      ideaId: 'idea-2',
      voterEmail: 'upstream@example.com',
      voterName: 'Upstream',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(upstreamError);
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('createVote returns NotFoundError when idea does not exist', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<VoteRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.createVote({
      ideaId: 'idea-missing',
      voterEmail: 'missing@example.com',
      voterName: 'Missing Idea',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Idée introuvable');
    }
  });

  it('createVote inserts vote and logs on success', async () => {
    const insertedVote: VoteRow = {
      id: 'vote-new',
      ideaId: 'idea-3',
      voterEmail: 'new@example.com',
      voterName: 'New Voter',
    };

    mockDb.select.mockImplementationOnce((): SelectWhereChain<VoteRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const txMock: TxMock = {
      insert: (_table: unknown): TxInsertChain => ({
        values: (_payload: unknown) => ({
          returning: async () => [insertedVote],
        }),
      }),
      delete: (_table: unknown): TxDeleteChain => ({
        where: async (_criteria: unknown) => undefined,
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<VoteRow>): Promise<VoteRow> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-3',
        title: 'Idée 3',
      } as IdeaRow,
    });

    const result = await storage.createVote({
      ideaId: 'idea-3',
      voterEmail: 'new@example.com',
      voterName: 'New Voter',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(insertedVote);
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Vote created', {
      voteId: 'vote-new',
      ideaId: 'idea-3',
      voterEmail: 'new@example.com',
    });
  });

  it('deleteVote returns NotFoundError when vote does not exist', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<VoteRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteVote('vote-missing');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Vote introuvable');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('deleteVote deletes existing vote and logs on success', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<VoteRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            id: 'vote-del',
            ideaId: 'idea-4',
            voterEmail: 'del@example.com',
          },
        ],
      }),
    }));

    const txMock: TxMock = {
      insert: (_table: unknown): TxInsertChain => ({
        values: (_payload: unknown) => ({
          returning: async () => [],
        }),
      }),
      delete: (_table: unknown): TxDeleteChain => ({
        where: async (_criteria: unknown) => undefined,
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<void>): Promise<void> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteVote('vote-del');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Vote deleted', {
      voteId: 'vote-del',
    });
  });

  it('deleteVote wraps select errors into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<VoteRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => {
          throw new Error('delete vote select failed');
        },
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteVote('vote-error');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la suppression du vote');
    }
  });
});
