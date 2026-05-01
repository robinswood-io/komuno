import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type MemberRow = {
  email: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  phone?: string | null;
  role?: string | null;
  cjdRole?: string | null;
  status?: string;
  updatedAt?: Date;
  lastActivityAt?: Date;
  activityCount?: number;
  engagementScore?: number;
};

type MemberInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  role?: string;
  notes?: string;
};

type SelectExistingWhereChain = {
  where: (criteria: unknown) => Promise<MemberRow[]>;
};

type SelectRoleWhereChain = {
  where: (criteria: unknown) => {
    limit: (count: number) => Promise<MemberRow[]>;
  };
};

type DbSelectChain = {
  from: (table: unknown) => SelectExistingWhereChain | SelectRoleWhereChain;
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

type InsertReturningChain = {
  returning: () => Promise<MemberRow[]>;
};

type InsertValuesChain = {
  values: (payload: unknown) => InsertReturningChain;
};

type DbMock = {
  select: ReturnType<typeof vi.fn<() => DbSelectChain>>;
  update: ReturnType<typeof vi.fn<(table: unknown) => UpdateSetChain>>;
  insert: ReturnType<typeof vi.fn<(table: unknown) => InsertValuesChain>>;
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
  insert: vi.fn(),
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
      insert: mockDb.insert,
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

describe('server/storage.js - iteration 17a members coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('createOrUpdateMember updates an existing member and returns updated row', async () => {
    const existingMember: MemberRow = {
      email: 'existing@komuno.test',
      firstName: 'Old',
      lastName: 'Name',
    };

    const updatedMember: MemberRow = {
      ...existingMember,
      firstName: 'New',
      lastName: 'Name',
      company: 'Komuno',
    };

    const selectWhere = vi.fn(async (_criteria: unknown) => [existingMember]);
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: selectWhere,
      }),
    });

    const whereSpy = vi.fn((_criteria: unknown) => ({
      returning: async () => [updatedMember],
    }));
    const setSpy = vi.fn((payload: unknown) => {
      const data = payload as Record<string, unknown>;
      expect(data.firstName).toBe('New');
      expect(data.company).toBe('Komuno');
      expect(data.lastName).toBeUndefined();
      return { where: whereSpy };
    });

    mockDb.update.mockReturnValue({ set: setSpy });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createOrUpdateMember({
      email: 'existing@komuno.test',
      firstName: 'New',
      company: 'Komuno',
    } as MemberInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedMember);
    }
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith('Member updated', {
      email: 'existing@komuno.test',
      updates: ['email', 'firstName', 'company'],
    });
  });

  it('createOrUpdateMember inserts a new member when none exists', async () => {
    const selectWhere = vi.fn(async (_criteria: unknown) => []);
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: selectWhere,
      }),
    });

    const insertedMember: MemberRow = {
      email: 'new@komuno.test',
      firstName: 'Alice',
      lastName: 'Durand',
    };

    const valuesSpy = vi.fn((_payload: unknown) => ({
      returning: async () => [insertedMember],
    }));

    mockDb.insert.mockReturnValue({ values: valuesSpy });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createOrUpdateMember({
      email: 'new@komuno.test',
      firstName: 'Alice',
      lastName: 'Durand',
      company: 'Komuno',
    } as MemberInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(insertedMember);
    }
    expect(valuesSpy).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith('Member created', {
      email: 'new@komuno.test',
      name: 'Alice Durand',
    });
  });

  it('createOrUpdateMember wraps select failures into DatabaseError', async () => {
    const selectWhere = vi.fn(async (_criteria: unknown) => {
      throw new Error('members select failed');
    });

    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: selectWhere,
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createOrUpdateMember({
      email: 'fail@komuno.test',
      firstName: 'Fail',
    } as MemberInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la création/mise à jour du membre');
    }
  });

  it('getMemberByCjdRole returns active member when found', async () => {
    const expectedMember: MemberRow = {
      email: 'recruiter@komuno.test',
      firstName: 'Camille',
      lastName: 'Roux',
      cjdRole: 'RESPONSABLE_RECRUTEMENT',
      status: 'active',
    };

    const limitSpy = vi.fn(async (count: number) => {
      expect(count).toBe(1);
      return [expectedMember];
    });

    const whereSpy = vi.fn((_criteria: unknown) => ({
      limit: limitSpy,
    }));

    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: whereSpy,
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getMemberByCjdRole('RESPONSABLE_RECRUTEMENT');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expectedMember);
    }
    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(limitSpy).toHaveBeenCalledTimes(1);
  });

  it('getMemberByCjdRole returns null when no active member exists', async () => {
    const whereSpy = vi.fn((_criteria: unknown) => ({
      limit: async (_count: number) => [],
    }));

    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: whereSpy,
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getMemberByCjdRole('PRESIDENT');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('getMemberByCjdRole wraps query errors into DatabaseError', async () => {
    const whereSpy = vi.fn((_criteria: unknown) => ({
      limit: async (_count: number) => {
        throw new Error('cjd role query failed');
      },
    }));

    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: whereSpy,
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getMemberByCjdRole('TRESORIER');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération du membre par rôle CJD');
    }
  });
});
