import { beforeEach, describe, expect, it, vi } from 'vitest';

type DbMock = {
  insert: ReturnType<typeof vi.fn>;
};

const mockDb: DbMock = {
  insert: vi.fn(),
};

vi.mock('../../../server/db', async () => {
  const real = await vi.importActual<typeof import('../../../server/db')>('../../../server/db');
  return {
    ...real,
    db: {
      ...real.db,
      insert: mockDb.insert,
    },
  };
});

vi.mock('../../../server/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('express-session', () => ({
  default: {},
}));

vi.mock('connect-pg-simple', () => ({
  default: () =>
    class MockPostgresSessionStore {
      constructor(_config: unknown) {
        // No-op
      }
    },
}));

describe('server/storage.js - focused unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
  });

  it('throws when DATABASE_URL points to Neon (constructor guard)', async () => {
    vi.resetModules();
    process.env.DATABASE_URL = 'postgresql://user:pwd@project.neon.tech/db';

    await expect(import('../../../server/storage.js')).rejects.toThrow(
      'PostgresSessionStore ne supporte pas Neon',
    );
  });

  it('createUser returns DuplicateError and skips insert when user already exists', async () => {
    vi.resetModules();
    const { DatabaseStorage } = await import('../../../server/storage.js');
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getUser').mockResolvedValue({
      success: true,
      data: {
        id: 'admin-1',
        email: 'admin@example.com',
      },
    });

    const result = await storage.createUser({
      email: 'admin@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      password: 'hashed-value',
      role: 'ideas_reader',
      status: 'pending',
      isActive: false,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected duplicate failure');
    }

    expect(result.error.name).toBe('DuplicateError');
    expect(result.error.message).toContain('Utilisateur déjà existant');
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('getUserByEmail delegates to getUser with same email', async () => {
    vi.resetModules();
    const { DatabaseStorage } = await import('../../../server/storage.js');
    const storage = new DatabaseStorage();
    const getUserSpy = vi.spyOn(storage, 'getUser').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.getUserByEmail('delegate@example.com');

    expect(getUserSpy).toHaveBeenCalledWith('delegate@example.com');
    expect(result.success).toBe(true);
  });

  it('createUser wraps insert exceptions into DatabaseError', async () => {
    vi.resetModules();
    const { DatabaseStorage } = await import('../../../server/storage.js');
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getUser').mockResolvedValue({
      success: true,
      data: null,
    });

    mockDb.insert.mockImplementation(() => ({
      values: () => ({
        returning: async () => {
          throw new Error('insert failed');
        },
      }),
    }));

    const result = await storage.createUser({
      email: 'new.user@example.com',
      firstName: 'New',
      lastName: 'User',
      password: 'hashed-value',
      role: 'ideas_reader',
      status: 'pending',
      isActive: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la création utilisateur');
    }
  });
});
