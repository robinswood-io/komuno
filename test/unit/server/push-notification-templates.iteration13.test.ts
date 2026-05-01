import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type NotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
};

type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string;
};

type NotificationServiceLike = {
  removeSubscription: (endpoint: string) => Promise<boolean>;
  sendToAll: (payload: NotificationPayload) => Promise<{ sent: number; failed: number }>;
  sendToSubscription: (
    subscription: PushSubscriptionInput,
    payload: NotificationPayload,
  ) => Promise<boolean>;
  getStats: () => { totalSubscriptions: number; activeSubscriptions: number };
  getVapidPublicKey: () => string;
};

type NotificationServiceModule = {
  NotificationService: new () => NotificationServiceLike;
};

type NotificationServiceInternals = NotificationServiceLike & {
  subscriptions: Map<string, PushSubscriptionInput>;
  batchSize: number;
};

type PreparedDeps = {
  runDbQueryMock: ReturnType<typeof vi.fn>;
  sendNotificationMock: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const notificationModulePath = cjsRequire.resolve('../../../server/notification-service.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const webPushModulePath = cjsRequire.resolve('web-push');

const asInternals = (service: NotificationServiceLike): NotificationServiceInternals => {
  return service as unknown as NotificationServiceInternals;
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

function setupNotificationDependencies(options?: {
  pushEnabled?: boolean;
  batchSize?: string;
  vapidPublicKey?: string;
  runDbQueryImpl?: (
    queryFn: () => Promise<unknown> | unknown,
    profile: string,
  ) => Promise<unknown>;
}): PreparedDeps {
  if (options?.pushEnabled === false) {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  } else {
    process.env.VAPID_PUBLIC_KEY = options?.vapidPublicKey ?? 'mock-public-key';
    process.env.VAPID_PRIVATE_KEY = 'mock-private-key';
    process.env.VAPID_SUBJECT = 'mailto:iteration13@example.com';
  }

  if (options?.batchSize === undefined) {
    delete process.env.PUSH_BATCH_SIZE;
  } else {
    process.env.PUSH_BATCH_SIZE = options.batchSize;
  }

  const runDbQueryMock = vi.fn(
    async (queryFn: () => Promise<unknown> | unknown, profile: string): Promise<unknown> => {
      if (options?.runDbQueryImpl) {
        return options.runDbQueryImpl(queryFn, profile);
      }
      if (profile === 'background') {
        return [];
      }
      if (profile === 'normal') {
        return [];
      }
      return undefined;
    },
  );

  const sendNotificationMock = vi.fn();

  setCjsModule(dbModulePath, {
    pool: {},
    dbResilience: {},
    QUERY_TIMEOUT_PROFILES: {},
    runDbQuery: runDbQueryMock,
    getPoolStats: vi.fn(),
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => []),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => undefined),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => undefined),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => undefined),
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

  setCjsModule(webPushModulePath, {
    __esModule: true,
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: sendNotificationMock,
      generateVAPIDKeys: vi.fn(() => ({
        publicKey: 'generated-public-key',
        privateKey: 'generated-private-key',
      })),
    },
  });

  return { runDbQueryMock, sendNotificationMock };
}

function loadNotificationModule(): NotificationServiceModule {
  delete cjsRequire.cache[notificationModulePath];
  return cjsRequire(notificationModulePath) as NotificationServiceModule;
}

describe('push notification templates iteration 13 (fallback notification-service.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    delete process.env.PUSH_BATCH_SIZE;
  });

  it('clamps batchSize to 100 when PUSH_BATCH_SIZE is too large', async () => {
    setupNotificationDependencies({ batchSize: '999' });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    expect(asInternals(service).batchSize).toBe(100);
  });

  it('sendToAll returns zero counts when there are no subscriptions', async () => {
    const { runDbQueryMock, sendNotificationMock } = setupNotificationDependencies();
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const result = await service.sendToAll({
      title: 'No subscriptions',
      body: 'Nothing to send',
    });

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(runDbQueryMock.mock.calls.some((call) => call[1] === 'background')).toBe(true);
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it('removeSubscription returns true when endpoint exists in memory and db call succeeds', async () => {
    const { runDbQueryMock } = setupNotificationDependencies();
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternals(service);

    internal.subscriptions.set('https://push.example/sub/remove-ok', {
      endpoint: 'https://push.example/sub/remove-ok',
      p256dh: 'k1',
      auth: 'a1',
    });

    const removed = await service.removeSubscription('https://push.example/sub/remove-ok');

    expect(removed).toBe(true);
    expect(runDbQueryMock.mock.calls.some((call) => call[1] === 'complex')).toBe(true);
    expect(internal.subscriptions.has('https://push.example/sub/remove-ok')).toBe(false);
  });

  it('removeSubscription returns false when db removal throws', async () => {
    setupNotificationDependencies({
      runDbQueryImpl: async (_queryFn, profile) => {
        if (profile === 'complex') {
          throw new Error('delete failed');
        }
        return [];
      },
    });

    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const removed = await service.removeSubscription('https://push.example/sub/remove-fail');

    expect(removed).toBe(false);
  });

  it('sendToSubscription does not remove endpoint when statusCode is non-numeric string', async () => {
    const { sendNotificationMock } = setupNotificationDependencies();
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const removeSpy = vi.spyOn(service, 'removeSubscription').mockResolvedValue(true);

    sendNotificationMock.mockRejectedValueOnce({ statusCode: 'not-a-number', message: 'Malformed' });

    const sent = await service.sendToSubscription(
      {
        endpoint: 'https://push.example/sub/non-numeric',
        p256dh: 'k2',
        auth: 'a2',
      },
      { title: 'T', body: 'B' },
    );

    expect(sent).toBe(false);
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('sendToSubscription removes endpoint when statusCode is permanent as number', async () => {
    const { sendNotificationMock } = setupNotificationDependencies();
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const removeSpy = vi.spyOn(service, 'removeSubscription').mockResolvedValue(true);

    sendNotificationMock.mockRejectedValueOnce({ statusCode: 404, message: 'Gone' });

    const sent = await service.sendToSubscription(
      {
        endpoint: 'https://push.example/sub/permanent-number',
        p256dh: 'k3',
        auth: 'a3',
      },
      { title: 'T2', body: 'B2' },
    );

    expect(sent).toBe(false);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith('https://push.example/sub/permanent-number');
  });

  it('getStats reflects in-memory subscription count and getVapidPublicKey returns trimmed env value', async () => {
    setupNotificationDependencies({ vapidPublicKey: '  key-with-spaces  ' });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternals(service);

    internal.subscriptions.set('one', { endpoint: 'one', p256dh: 'k1', auth: 'a1' });
    internal.subscriptions.set('two', { endpoint: 'two', p256dh: 'k2', auth: 'a2' });

    expect(service.getStats()).toEqual({
      totalSubscriptions: 2,
      activeSubscriptions: 2,
    });
    expect(service.getVapidPublicKey()).toBe('key-with-spaces');
  });
});
