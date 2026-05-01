import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type PatronRow = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type DonationRow = {
  id: string;
  patronId: string;
  amount: number;
  donatedAt?: Date;
};

type ProposalRow = {
  id: string;
  ideaId: string;
  patronId: string;
  status?: string;
};

type SponsorshipRow = {
  id: string;
  eventId: string;
  patronId: string;
  amount: number;
  level: 'platinum' | 'gold' | 'silver' | 'bronze' | 'partner';
  status?: string;
  confirmedAt?: Date | null;
};

type SelectFromWhereChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => Promise<T[]>;
  };
};

type UpdateSetWhereReturningChain<T> = {
  set: (payload: unknown) => {
    where: (criteria: unknown) => {
      returning: () => Promise<T[]>;
    };
  };
};

type InsertValuesReturningChain<T> = {
  values: (payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type TxDeleteWhereChain = {
  where: (criteria: unknown) => Promise<unknown>;
};

type TxMock = {
  delete: (table: unknown) => TxDeleteWhereChain;
};

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

type UniqueConstraintError = {
  code: '23505';
  constraint: string;
  message: string;
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
      insert: mockDb.insert,
      update: mockDb.update,
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

describe('server/storage.js - iteration 11f guard/fallback branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('createIdeaPatronProposal returns DuplicateError on unique constraint', async () => {
    const duplicateError: UniqueConstraintError = {
      code: '23505',
      constraint: 'idea_patron_proposals_idea_id_patron_id_unique',
      message: 'duplicate key value violates unique constraint',
    };

    mockDb.insert.mockImplementationOnce(
      (): InsertValuesReturningChain<ProposalRow> => ({
        values: (_payload: unknown) => ({
          returning: async () => {
            throw duplicateError;
          },
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createIdeaPatronProposal({
      ideaId: 'idea-1',
      patronId: 'patron-1',
      status: 'pending',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('Une proposition existe déjà');
    }
  });

  it('updatePatron returns NotFoundError when patron does not exist', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getPatronById').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.updatePatron('patron-missing', {
      firstName: 'Nouveau',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Mécène introuvable');
    }
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('updatePatron maps postgres unique constraint to DuplicateError', async () => {
    const duplicateError: UniqueConstraintError = {
      code: '23505',
      constraint: 'patrons_email_unique',
      message: 'duplicate key value violates unique constraint',
    };

    mockDb.update.mockImplementationOnce(
      (): UpdateSetWhereReturningChain<PatronRow> => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => {
              throw duplicateError;
            },
          }),
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getPatronById').mockResolvedValue({
      success: true,
      data: {
        id: 'patron-10',
        email: 'old@example.com',
      },
    });

    const result = await storage.updatePatron('patron-10', {
      email: 'already-used@example.com',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('Un mécène avec cet email existe déjà');
    }
  });

  it('deletePatron wraps transaction failures into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValueOnce(new Error('delete patron tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getPatronById').mockResolvedValue({
      success: true,
      data: {
        id: 'patron-err',
        firstName: 'Échec',
      },
    });

    const result = await storage.deletePatron('patron-err');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la suppression du mécène');
    }
  });

  it('updatePatronDonation returns NotFoundError when donation does not exist', async () => {
    mockDb.select.mockImplementationOnce(
      (): SelectFromWhereChain<DonationRow> => ({
        from: (_table: unknown) => ({
          where: async (_criteria: unknown) => [],
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updatePatronDonation('donation-missing', {
      amount: 900,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Don introuvable');
    }
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('updatePatronDonation wraps select failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce(
      (): SelectFromWhereChain<DonationRow> => ({
        from: (_table: unknown) => ({
          where: async (_criteria: unknown) => {
            throw new Error('select donation failed');
          },
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updatePatronDonation('donation-err', {
      amount: 1000,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la mise à jour du don');
    }
  });

  it('updateEventSponsorship normalizes confirmedAt to null and returns success', async () => {
    let capturedSetPayload: unknown;

    mockDb.select.mockImplementationOnce(
      (): SelectFromWhereChain<SponsorshipRow> => ({
        from: (_table: unknown) => ({
          where: async (_criteria: unknown) => [
            {
              id: 's-1',
              eventId: 'evt-1',
              patronId: 'patron-1',
              amount: 2000,
              level: 'gold',
              status: 'confirmed',
              confirmedAt: new Date('2035-01-01T00:00:00.000Z'),
            },
          ],
        }),
      }),
    );

    mockDb.update.mockImplementationOnce(
      (): UpdateSetWhereReturningChain<SponsorshipRow> => ({
        set: (payload: unknown) => {
          capturedSetPayload = payload;
          return {
            where: (_criteria: unknown) => ({
              returning: async () => [
                {
                  id: 's-1',
                  eventId: 'evt-1',
                  patronId: 'patron-1',
                  amount: 2000,
                  level: 'gold',
                  status: 'confirmed',
                  confirmedAt: null,
                },
              ],
            }),
          };
        },
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateEventSponsorship('s-1', {
      confirmedAt: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confirmedAt).toBeNull();
    }

    const payload = capturedSetPayload as { confirmedAt?: Date | null };
    expect(payload.confirmedAt).toBeNull();
  });

  it('updateEventSponsorship returns NotFoundError when sponsorship does not exist', async () => {
    mockDb.select.mockImplementationOnce(
      (): SelectFromWhereChain<SponsorshipRow> => ({
        from: (_table: unknown) => ({
          where: async (_criteria: unknown) => [],
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateEventSponsorship('s-missing', {
      status: 'completed',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Sponsoring introuvable');
    }
  });

  it('deleteEventSponsorship wraps transaction failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce(
      (): SelectFromWhereChain<SponsorshipRow> => ({
        from: (_table: unknown) => ({
          where: async (_criteria: unknown) => [
            {
              id: 's-del',
              eventId: 'evt-9',
              patronId: 'patron-9',
              amount: 1500,
              level: 'silver',
            },
          ],
        }),
      }),
    );

    mockDb.transaction.mockRejectedValueOnce(new Error('delete sponsorship tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteEventSponsorship('s-del');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la suppression du sponsoring');
    }
  });
});
