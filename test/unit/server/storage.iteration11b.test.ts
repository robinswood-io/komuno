import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type EventListRow = {
  id: string;
  title: string;
  date: Date;
  inscriptionCount: number | string;
  unsubscriptionCount: number | string;
};

type EventRow = {
  id: string;
  title: string;
  date: Date;
  status?: string;
};

type InscriptionRow = {
  id: string;
  eventId: string;
  name: string;
  email: string;
};

type EventCreateInput = {
  title: string;
  date: string;
  maxParticipants?: number;
};

type InitialInscriptionInput = {
  name: string;
  email: string;
};

type SelectCountChain = {
  from: (table: unknown) => Promise<Array<{ count: number }>>;
};

type SelectEventsChain = {
  from: (table: unknown) => {
    leftJoin: (table: unknown, condition: unknown) => {
      leftJoin: (table: unknown, condition: unknown) => {
        groupBy: (value: unknown) => {
          orderBy: (value: unknown) => {
            limit: (value: number) => {
              offset: (value: number) => Promise<EventListRow[]>;
            };
          };
        };
      };
    };
  };
};

type SelectInscriptionsChain = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      orderBy: (ordering: unknown) => Promise<InscriptionRow[]>;
    };
  };
};

type TxUpdateChain = {
  set: (payload: unknown) => {
    where: (criteria: unknown) => {
      returning: () => Promise<EventRow[]>;
    };
  };
};

type TxInsertChain<T> = {
  values: (payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type TxUpdateMock = {
  update: (table: unknown) => TxUpdateChain;
};

type TxCreateMock = {
  insert: (table: unknown) => TxInsertChain<EventRow> | TxInsertChain<InscriptionRow>;
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

describe('server/storage.js - iteration 11b events list/get/update/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getAllEvents returns paginated formatted payload on success', async () => {
    mockDb.select
      .mockImplementationOnce((): SelectCountChain => ({
        from: async (_table: unknown) => [{ count: 3 }],
      }))
      .mockImplementationOnce((): SelectEventsChain => ({
        from: (_table: unknown) => ({
          leftJoin: (_tableA: unknown, _conditionA: unknown) => ({
            leftJoin: (_tableB: unknown, _conditionB: unknown) => ({
              groupBy: (_value: unknown) => ({
                orderBy: (_order: unknown) => ({
                  limit: (_limit: number) => ({
                    offset: async (_offset: number) => [
                      {
                        id: 'evt-1',
                        title: 'AG annuelle',
                        date: new Date('2037-01-10T09:00:00.000Z'),
                        inscriptionCount: '2',
                        unsubscriptionCount: '1',
                      },
                    ],
                  }),
                }),
              }),
            }),
          }),
        }),
      }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllEvents({ page: 1, limit: 10 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(3);
      expect(result.data.data[0]?.inscriptionCount).toBe(2);
      expect(result.data.data[0]?.unsubscriptionCount).toBe(1);
    }
  });

  it('getAllEvents wraps select failures into DatabaseError', async () => {
    mockDb.select.mockImplementation((): SelectCountChain => ({
      from: async (_table: unknown) => {
        throw new Error('events listing failed');
      },
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllEvents({ page: 1, limit: 20 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération admin des événements');
    }
  });

  it('getEventInscriptions returns inscriptions list on success', async () => {
    const inscriptions: InscriptionRow[] = [
      { id: 'ins-1', eventId: 'evt-7', name: 'Alice', email: 'alice@example.com' },
    ];

    mockDb.select.mockImplementation((): SelectInscriptionsChain => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => inscriptions,
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getEventInscriptions('evt-7');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(inscriptions);
    }
  });

  it('getEventInscriptions wraps failures into DatabaseError', async () => {
    mockDb.select.mockImplementation((): SelectInscriptionsChain => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => {
            throw new Error('inscriptions query failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getEventInscriptions('evt-err');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des inscriptions');
    }
  });

  it('updateEvent returns updated event when transaction succeeds', async () => {
    const updatedEvent: EventRow = {
      id: 'evt-9',
      title: 'Événement modifié',
      date: new Date('2038-06-10T15:00:00.000Z'),
      status: 'published',
    };

    const txMock: TxUpdateMock = {
      update: (_table: unknown): TxUpdateChain => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => [updatedEvent],
          }),
        }),
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxUpdateMock) => Promise<EventRow>): Promise<EventRow> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: {
        id: 'evt-9',
        title: 'Événement initial',
        date: new Date('2038-06-01T10:00:00.000Z'),
      },
    });

    const result = await storage.updateEvent('evt-9', { title: 'Événement modifié' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedEvent);
    }
  });

  it('updateEvent wraps transaction failure into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValue(new Error('update tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: {
        id: 'evt-10',
        title: 'Événement initial',
        date: new Date('2039-01-01T09:00:00.000Z'),
      },
    });

    const result = await storage.updateEvent('evt-10', { title: 'Nouveau titre' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la mise à jour de l'événement");
    }
  });

  it('createEventWithInscriptions returns success with event and created inscriptions', async () => {
    const createdEvent: EventRow = {
      id: 'evt-11',
      title: 'Séminaire',
      date: new Date('2040-03-20T08:30:00.000Z'),
    };

    const createdInscriptions: InscriptionRow[] = [
      { id: 'ins-a', eventId: 'evt-11', name: 'Noah', email: 'noah@example.com' },
      { id: 'ins-b', eventId: 'evt-11', name: 'Lina', email: 'lina@example.com' },
    ];

    let insertCalls = 0;

    const txMock: TxCreateMock = {
      insert: (_table: unknown) => {
        insertCalls += 1;

        if (insertCalls === 1) {
          return {
            values: (_payload: unknown) => ({
              returning: async () => [createdEvent],
            }),
          };
        }

        return {
          values: (_payload: unknown) => ({
            returning: async () => createdInscriptions,
          }),
        };
      },
    };

    mockDb.transaction.mockImplementation(
      async (
        callback: (tx: TxCreateMock) => Promise<{ event: EventRow; inscriptions: InscriptionRow[] }>,
      ): Promise<{ event: EventRow; inscriptions: InscriptionRow[] }> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(false);

    const eventInput: EventCreateInput = {
      title: 'Séminaire',
      date: '2040-03-20T08:30:00.000Z',
      maxParticipants: 10,
    };

    const inscriptionsInput: InitialInscriptionInput[] = [
      { name: 'Noah', email: 'noah@example.com' },
      { name: 'Lina', email: 'lina@example.com' },
    ];

    const result = await storage.createEventWithInscriptions(eventInput, inscriptionsInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.event).toEqual(createdEvent);
      expect(result.data.inscriptions).toEqual(createdInscriptions);
    }
  });

  it('createEventWithInscriptions returns ValidationError on duplicate inscription emails', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(false);

    const result = await storage.createEventWithInscriptions(
      {
        title: 'Atelier design',
        date: '2041-05-11T14:00:00.000Z',
      },
      [
        { name: 'Alex', email: 'dup@example.com' },
        { name: 'Alex 2', email: 'DUP@example.com' },
      ],
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.message).toContain('emails en double');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });
});
