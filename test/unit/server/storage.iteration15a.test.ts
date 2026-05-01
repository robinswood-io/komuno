import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type PatronRow = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

type DonationRow = {
  id: string;
  patronId: string;
  amount: number;
  donatedAt: Date;
};

type PublicSponsorshipRow = {
  id: string;
  eventId: string;
  patronId: string;
  level: string;
  amount: number;
  patronCompany: string | null;
};

type SponsorshipRow = {
  id: string;
  eventId: string;
  patronId: string;
  amount: number;
  createdAt: Date;
};

type SelectWhereChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => Promise<T[]>;
  };
};

type SelectWhereOrderByChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      orderBy: (...ordering: unknown[]) => Promise<T[]>;
    };
  };
};

type SelectOrderByChain<T> = {
  from: (table: unknown) => {
    orderBy: (...ordering: unknown[]) => Promise<T[]>;
  };
};

type SelectPublicSponsorshipChain<T> = {
  from: (table: unknown) => {
    innerJoin: (joinTable: unknown, joinCondition: unknown) => {
      where: (criteria: unknown) => {
        orderBy: (ordering: unknown) => Promise<T[]>;
      };
    };
  };
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
          // no-op
        }
      },
  );
}

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

describe('server/storage.js - iteration 15a isolated retrieval methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getPatronByEmail returns first row when patron exists', async () => {
    const patron: PatronRow = {
      id: 'patron-1',
      email: 'patron@example.com',
      firstName: 'Alice',
      lastName: 'Martin',
    };

    mockDb.select.mockImplementationOnce(
      (): SelectWhereChain<PatronRow> => ({
        from: (_table: unknown) => ({
          where: async (_criteria: unknown) => [patron],
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getPatronByEmail('patron@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(patron);
    }
    expect(loggerMock.debug).toHaveBeenCalledWith('Patron retrieved by email', {
      email: 'patron@example.com',
    });
  });

  it('getPatronByEmail returns null when no row is found', async () => {
    mockDb.select.mockImplementationOnce(
      (): SelectWhereChain<PatronRow> => ({
        from: (_table: unknown) => ({
          where: async (_criteria: unknown) => [],
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getPatronByEmail('missing@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('getPatronByEmail wraps select failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce(
      (): SelectWhereChain<PatronRow> => ({
        from: (_table: unknown) => ({
          where: async (_criteria: unknown) => {
            throw new Error('patron email lookup failed');
          },
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getPatronByEmail('error@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération du mécène par email');
    }
  });

  it('getPatronDonations returns ordered donations for a patron', async () => {
    const donations: DonationRow[] = [
      {
        id: 'don-2',
        patronId: 'patron-2',
        amount: 300,
        donatedAt: new Date('2032-02-02T00:00:00.000Z'),
      },
      {
        id: 'don-1',
        patronId: 'patron-2',
        amount: 120,
        donatedAt: new Date('2032-01-01T00:00:00.000Z'),
      },
    ];

    mockDb.select.mockImplementationOnce(
      (): SelectWhereOrderByChain<DonationRow> => ({
        from: (_table: unknown) => ({
          where: (_criteria: unknown) => ({
            orderBy: async (..._ordering: unknown[]) => donations,
          }),
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getPatronDonations('patron-2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(donations);
    }
    expect(loggerMock.debug).toHaveBeenCalledWith('Patron donations retrieved', {
      patronId: 'patron-2',
    });
  });

  it('getPatronDonations wraps query failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce(
      (): SelectWhereOrderByChain<DonationRow> => ({
        from: (_table: unknown) => ({
          where: (_criteria: unknown) => ({
            orderBy: async (..._ordering: unknown[]) => {
              throw new Error('patron donations query failed');
            },
          }),
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getPatronDonations('patron-err');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des dons du mécène');
    }
  });

  it('getAllDonations returns all donations and logs debug', async () => {
    const donations: DonationRow[] = [
      {
        id: 'don-all-1',
        patronId: 'patron-all',
        amount: 50,
        donatedAt: new Date('2033-01-01T00:00:00.000Z'),
      },
    ];

    mockDb.select.mockImplementationOnce(
      (): SelectOrderByChain<DonationRow> => ({
        from: (_table: unknown) => ({
          orderBy: async (..._ordering: unknown[]) => donations,
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllDonations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(donations);
    }
    expect(loggerMock.debug).toHaveBeenCalledWith('All donations retrieved');
  });

  it('getAllDonations wraps query failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce(
      (): SelectOrderByChain<DonationRow> => ({
        from: (_table: unknown) => ({
          orderBy: async (..._ordering: unknown[]) => {
            throw new Error('all donations query failed');
          },
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllDonations();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des dons');
    }
  });

  it('getPublicEventSponsorships returns mapped public sponsorship rows and logs count', async () => {
    const rows: PublicSponsorshipRow[] = [
      {
        id: 'pub-1',
        eventId: 'evt-public',
        patronId: 'patron-public',
        level: 'gold',
        amount: 2500,
        patronCompany: 'Acme Corp',
      },
    ];

    mockDb.select.mockImplementationOnce(
      (): SelectPublicSponsorshipChain<PublicSponsorshipRow> => ({
        from: (_table: unknown) => ({
          innerJoin: (_joinTable: unknown, _joinCondition: unknown) => ({
            where: (_criteria: unknown) => ({
              orderBy: async (_ordering: unknown) => rows,
            }),
          }),
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getPublicEventSponsorships('evt-public');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(rows);
    }
    expect(loggerMock.debug).toHaveBeenCalledWith('Public event sponsorships retrieved', {
      eventId: 'evt-public',
      count: 1,
    });
  });

  it('getPublicEventSponsorships wraps query failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce(
      (): SelectPublicSponsorshipChain<PublicSponsorshipRow> => ({
        from: (_table: unknown) => ({
          innerJoin: (_joinTable: unknown, _joinCondition: unknown) => ({
            where: (_criteria: unknown) => ({
              orderBy: async (_ordering: unknown) => {
                throw new Error('public sponsorship query failed');
              },
            }),
          }),
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getPublicEventSponsorships('evt-public-err');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain(
        "Erreur lors de la récupération des sponsorings publics de l'événement",
      );
    }
  });

  it('getAllSponsorships returns all rows and getAllSponsorships error path wraps failure', async () => {
    const rows: SponsorshipRow[] = [
      {
        id: 's-all-1',
        eventId: 'evt-1',
        patronId: 'pat-1',
        amount: 999,
        createdAt: new Date('2034-04-04T00:00:00.000Z'),
      },
    ];

    mockDb.select
      .mockImplementationOnce(
        (): SelectOrderByChain<SponsorshipRow> => ({
          from: (_table: unknown) => ({
            orderBy: async (..._ordering: unknown[]) => rows,
          }),
        }),
      )
      .mockImplementationOnce(
        (): SelectOrderByChain<SponsorshipRow> => ({
          from: (_table: unknown) => ({
            orderBy: async (..._ordering: unknown[]) => {
              throw new Error('all sponsorships query failed');
            },
          }),
        }),
      );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const successResult = await storage.getAllSponsorships();
    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.data).toEqual(rows);
    }

    const errorResult = await storage.getAllSponsorships();
    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error.name).toBe('DatabaseError');
      expect(errorResult.error.message).toContain('Erreur lors de la récupération des sponsorings');
    }
  });
});
