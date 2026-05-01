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
          // No-op
        }
      },
  );
}

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

describe('server/storage.js - iteration 21a email config branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
    runDbQueryMock.mockImplementation(async (queryFn: () => Promise<unknown>) => queryFn());
  });

  it('getEmailConfig returns existing config row when query succeeds', async () => {
    const existingConfig: EmailConfigRow = {
      id: 'ecfg-1',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'mailer',
      smtpPass: 'secret',
      fromEmail: 'noreply@example.com',
      fromName: 'Komuno',
      updatedBy: 'admin@example.com',
    };

    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        limit: async (_count: number) => [existingConfig],
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getEmailConfig();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(existingConfig);
    }
    expect(runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'quick');
  });

  it('getEmailConfig returns null when no config row exists', async () => {
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        limit: async (_count: number) => [],
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getEmailConfig();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
    expect(runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'quick');
  });

  it('getEmailConfig returns DatabaseError when runDbQuery fails', async () => {
    runDbQueryMock.mockImplementation(async () => {
      throw new Error('email quick query failed');
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getEmailConfig();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération de la configuration email');
    }
  });

  it('updateEmailConfig updates existing row when config already exists', async () => {
    const existingConfig: EmailConfigRow = {
      id: 'ecfg-existing',
      smtpHost: 'old.smtp',
      smtpPort: 25,
      smtpUser: 'old-user',
      smtpPass: 'old-pass',
      fromEmail: 'old@example.com',
      fromName: 'Old',
      updatedBy: 'old-admin@example.com',
    };

    const updatedConfig: EmailConfigRow = {
      id: 'ecfg-existing',
      smtpHost: 'new.smtp',
      smtpPort: 465,
      smtpUser: 'new-user',
      smtpPass: 'new-pass',
      fromEmail: 'new@example.com',
      fromName: 'New Name',
      updatedBy: 'new-admin@example.com',
    };

    let capturedUpdatePayload: unknown;
    const insertSpy = vi.fn((_table: unknown): TxInsertChain => ({
      values: (_payload: unknown) => ({
        returning: async () => [updatedConfig],
      }),
    }));

    const txMock: TxMock = {
      select: (): TxSelectLimitChain => ({
        from: (_table: unknown) => ({
          limit: async (_count: number) => [existingConfig],
        }),
      }),
      update: (_table: unknown): TxUpdateChain => ({
        set: (payload: unknown) => {
          capturedUpdatePayload = payload;
          return {
            where: (_criteria: unknown) => ({
              returning: async () => [updatedConfig],
            }),
          };
        },
      }),
      insert: insertSpy,
    };

    mockDb.transaction.mockImplementationOnce(
      async (callback: (tx: TxMock) => Promise<EmailConfigRow>) => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateEmailConfig(
      {
        smtpHost: 'new.smtp',
        smtpPort: 465,
        smtpUser: 'new-user',
        smtpPass: 'new-pass',
        fromEmail: 'new@example.com',
        fromName: 'New Name',
      } as EmailConfigInput,
      'new-admin@example.com',
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedConfig);
    }

    const payload = capturedUpdatePayload as Record<string, unknown>;
    expect(payload.smtpHost).toBe('new.smtp');
    expect(payload.updatedBy).toBe('new-admin@example.com');
    expect(payload.updatedAt).toBeDefined();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('updateEmailConfig inserts row when no config exists', async () => {
    const insertedConfig: EmailConfigRow = {
      id: 'ecfg-new',
      smtpHost: 'smtp.inserted',
      smtpPort: 2525,
      smtpUser: 'insert-user',
      smtpPass: 'insert-pass',
      fromEmail: 'insert@example.com',
      fromName: 'Insert Name',
      updatedBy: 'owner@example.com',
    };

    let capturedInsertPayload: unknown;
    const updateSpy = vi.fn((_table: unknown): TxUpdateChain => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [insertedConfig],
        }),
      }),
    }));

    const txMock: TxMock = {
      select: (): TxSelectLimitChain => ({
        from: (_table: unknown) => ({
          limit: async (_count: number) => [],
        }),
      }),
      update: updateSpy,
      insert: (_table: unknown): TxInsertChain => ({
        values: (payload: unknown) => {
          capturedInsertPayload = payload;
          return {
            returning: async () => [insertedConfig],
          };
        },
      }),
    };

    mockDb.transaction.mockImplementationOnce(
      async (callback: (tx: TxMock) => Promise<EmailConfigRow>) => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateEmailConfig(
      {
        smtpHost: 'smtp.inserted',
        smtpPort: 2525,
        smtpUser: 'insert-user',
        smtpPass: 'insert-pass',
        fromEmail: 'insert@example.com',
        fromName: 'Insert Name',
      } as EmailConfigInput,
      'owner@example.com',
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(insertedConfig);
    }

    const payload = capturedInsertPayload as Record<string, unknown>;
    expect(payload.smtpHost).toBe('smtp.inserted');
    expect(payload.updatedBy).toBe('owner@example.com');
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('updateEmailConfig returns DatabaseError when transaction throws', async () => {
    mockDb.transaction.mockRejectedValueOnce(new Error('email transaction failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateEmailConfig(
      {
        smtpHost: 'smtp.fail',
        smtpPort: 587,
        smtpUser: 'fail-user',
        smtpPass: 'fail-pass',
        fromEmail: 'fail@example.com',
        fromName: 'Fail',
      } as EmailConfigInput,
      'admin@example.com',
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la mise à jour de la configuration email');
    }
  });
});
