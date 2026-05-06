import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type NotificationPayload = {
  title: string;
  body: string;
  icon?: unknown;
  badge?: unknown;
  tag?: unknown;
  data?: unknown;
  actions?: unknown;
};

type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string;
};

type NotificationServiceLike = {
  addSubscription: (subscription: PushSubscriptionInput) => Promise<boolean>;
  sendToSubscription: (subscription: PushSubscriptionInput, payload: NotificationPayload) => Promise<boolean>;
  getStats: () => { totalSubscriptions: number; activeSubscriptions: number };
};

type NotificationServiceInternal = NotificationServiceLike & {
  isLoaded: boolean;
  subscriptions: Map<string, PushSubscriptionInput>;
  batchSize: number;
  resolveBatchSize: (rawBatchSize?: string) => number;
  getStatusCode: (error: unknown) => number | null;
};

type NotificationServiceModule = {
  NotificationService: new () => NotificationServiceLike;
};

type RunDbQueryImpl = (queryFn: () => Promise<unknown> | unknown, profile: string) => Promise<unknown>;

type PreparedDeps = {
  runDbQueryMock: ReturnType<typeof vi.fn<RunDbQueryImpl>>;
  sendNotificationMock: ReturnType<typeof vi.fn>;
  insertValuesMock: ReturnType<typeof vi.fn>;
  updateSetMock: ReturnType<typeof vi.fn>;
};

type CjsCacheModule = {
  id: string;
  filename: string;
  loaded: boolean;
  children: unknown[];
  paths: string[];
  exports: unknown;
};

const cjsRequire = createRequire(import.meta.url);
const notificationModulePath = cjsRequire.resolve('../../../server/notification-service.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const webPushModulePath = cjsRequire.resolve('web-push');

const asInternal = (service: NotificationServiceLike): NotificationServiceInternal =>
  service as unknown as NotificationServiceInternal;

function setCjsModule(path: string, exportsValue: unknown): void {
  const previous = cjsRequire.cache[path] as CjsCacheModule | undefined;
  cjsRequire.cache[path] = {
    ...(previous ?? {
      id: path,
      filename: path,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: exportsValue,
  } as CjsCacheModule;
}

function setupDependencies(options?: { runDbQueryImpl?: RunDbQueryImpl; selectResults?: unknown[] }): PreparedDeps {
  process.env.VAPID_PUBLIC_KEY = 'iteration37-public-key';
  process.env.VAPID_PRIVATE_KEY = 'iteration37-private-key';
  process.env.VAPID_SUBJECT = 'mailto:iteration37@example.com';

  const runDbQueryMock = vi.fn<RunDbQueryImpl>(
    async (queryFn: () => Promise<unknown> | unknown, profile: string): Promise<unknown> => {
      if (options?.runDbQueryImpl) {
        return options.runDbQueryImpl(queryFn, profile);
      }
      if (profile === 'background') {
        return [];
      }
      return queryFn();
    },
  );

  const selectResultsQueue = [...(options?.selectResults ?? [])];

  const selectLimitMock = vi.fn(() => (selectResultsQueue.shift() as unknown[]) ?? []);
  const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }));
  const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
  const selectMock = vi.fn(() => ({ from: selectFromMock }));

  const insertValuesMock = vi.fn(async () => undefined);
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));

  const updateWhereMock = vi.fn(async () => undefined);
  const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
  const updateMock = vi.fn(() => ({ set: updateSetMock }));

  setCjsModule(dbModulePath, {
    runDbQuery: runDbQueryMock,
    db: {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
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

  const sendNotificationMock = vi.fn(async () => undefined);
  setCjsModule(webPushModulePath, {
    __esModule: true,
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: sendNotificationMock,
      generateVAPIDKeys: vi.fn(() => ({
        publicKey: 'generated-public',
        privateKey: 'generated-private',
      })),
    },
  });

  return {
    runDbQueryMock,
    sendNotificationMock,
    insertValuesMock,
    updateSetMock,
  };
}

function loadNotificationModule(): NotificationServiceModule {
  delete cjsRequire.cache[notificationModulePath];
  return cjsRequire(notificationModulePath) as NotificationServiceModule;
}

describe('server/notification-service.js iteration37 - uncovered tails and db branch callbacks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.PUSH_BATCH_SIZE;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    delete cjsRequire.cache[notificationModulePath];
    delete cjsRequire.cache[dbModulePath];
    delete cjsRequire.cache[loggerModulePath];
    delete cjsRequire.cache[webPushModulePath];
  });

  it('executes addSubscription insert and update callbacks to raise db-side function coverage', async () => {
    const deps = setupDependencies({
      selectResults: [[], [{ endpoint: 'https://push.example/sub-37' }]],
    });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternal(service);
    internal.isLoaded = true;

    const insertResult = await service.addSubscription({
      endpoint: 'https://push.example/sub-37',
      p256dh: 'k-37',
      auth: 'a-37',
    });
    const updateResult = await service.addSubscription({
      endpoint: 'https://push.example/sub-37',
      p256dh: 'k-37-upd',
      auth: 'a-37-upd',
      userId: 'member37@example.com',
    });

    expect(insertResult).toBe(true);
    expect(updateResult).toBe(true);

    expect(deps.insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://push.example/sub-37',
        userEmail: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );
    expect(deps.updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        p256dh: 'k-37-upd',
        auth: 'a-37-upd',
        userEmail: 'member37@example.com',
        updatedAt: expect.any(Date),
      }),
    );

    expect(deps.runDbQueryMock.mock.calls.filter((call) => call[1] === 'normal').length).toBe(2);
    expect(deps.runDbQueryMock.mock.calls.filter((call) => call[1] === 'complex').length).toBe(2);
  });

  it('covers tail helpers getStats, resolveBatchSize and getStatusCode object branch', () => {
    process.env.PUSH_BATCH_SIZE = '25';
    setupDependencies();
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternal(service);

    internal.subscriptions.set('https://push.example/s1', {
      endpoint: 'https://push.example/s1',
      p256dh: 'k1',
      auth: 'a1',
    });
    internal.subscriptions.set('https://push.example/s2', {
      endpoint: 'https://push.example/s2',
      p256dh: 'k2',
      auth: 'a2',
    });

    expect(internal.batchSize).toBe(25);
    expect(internal.resolveBatchSize('abc')).toBe(10);
    expect(internal.resolveBatchSize('101')).toBe(100);
    expect(internal.getStatusCode({ statusCode: false })).toBeNull();
    expect(internal.getStatusCode({ statusCode: '503' })).toBe(503);
    expect(service.getStats()).toEqual({
      totalSubscriptions: 2,
      activeSubscriptions: 2,
    });
  });

  it('keeps explicit icon/badge/tag/data/actions when payload is valid', async () => {
    const deps = setupDependencies();
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const ok = await service.sendToSubscription(
      {
        endpoint: 'https://push.example/subscription-37',
        p256dh: 'k-sub',
        auth: 'a-sub',
      },
      {
        title: 'Iteration 37 payload',
        body: 'Valid object values',
        icon: '/icons/custom.svg',
        badge: '/icons/badge.svg',
        tag: 'custom-tag-37',
        data: { section: 'ops', id: '37' },
        actions: [{ action: 'open', title: 'Ouvrir' }],
      },
    );

    expect(ok).toBe(true);
    const payload = deps.sendNotificationMock.mock.calls[0]?.[1];
    expect(typeof payload).toBe('string');
    const parsedPayload = JSON.parse(payload as string) as {
      icon: string;
      badge: string;
      tag: string;
      data: Record<string, unknown>;
      actions: Array<{ action: string; title: string }>;
    };

    expect(parsedPayload.icon).toBe('/icons/custom.svg');
    expect(parsedPayload.badge).toBe('/icons/badge.svg');
    expect(parsedPayload.tag).toBe('custom-tag-37');
    expect(parsedPayload.data).toEqual({ section: 'ops', id: '37' });
    expect(parsedPayload.actions).toEqual([{ action: 'open', title: 'Ouvrir' }]);
  });
});
