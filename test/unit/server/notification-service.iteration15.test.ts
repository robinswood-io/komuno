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
  loadSubscriptions: () => Promise<void>;
  addSubscription: (subscription: PushSubscriptionInput) => Promise<boolean>;
  sendToAll: (payload: NotificationPayload) => Promise<{ sent: number; failed: number }>;
  getVapidPublicKey: () => string;
};

type NotificationServiceInternal = NotificationServiceLike & {
  isLoaded: boolean;
  subscriptions: Map<string, PushSubscriptionInput>;
  getStatusCode: (error: unknown) => number | null;
};

type NotificationServiceModule = {
  NotificationService: new () => NotificationServiceLike;
};

type RunDbQueryImpl = (
  queryFn: () => Promise<unknown> | unknown,
  profile: string,
) => Promise<unknown>;

type PreparedDeps = {
  runDbQueryMock: ReturnType<typeof vi.fn<RunDbQueryImpl>>;
  setVapidDetailsMock: ReturnType<typeof vi.fn>;
  loggerMock: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
};

const cjsRequire = createRequire(import.meta.url);
const notificationModulePath = cjsRequire.resolve('../../../server/notification-service.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const webPushModulePath = cjsRequire.resolve('web-push');

const asInternal = (service: NotificationServiceLike): NotificationServiceInternal => {
  return service as unknown as NotificationServiceInternal;
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
  throwOnSetVapidDetails?: boolean;
  runDbQueryImpl?: RunDbQueryImpl;
}): PreparedDeps {
  if (options?.pushEnabled === false) {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  } else {
    process.env.VAPID_PUBLIC_KEY = 'iteration15-public';
    process.env.VAPID_PRIVATE_KEY = 'iteration15-private';
    process.env.VAPID_SUBJECT = 'mailto:iteration15@example.com';
  }

  delete process.env.PUSH_BATCH_SIZE;

  const runDbQueryMock = vi.fn<RunDbQueryImpl>(
    async (queryFn: () => Promise<unknown> | unknown, profile: string): Promise<unknown> => {
      if (options?.runDbQueryImpl) {
        return options.runDbQueryImpl(queryFn, profile);
      }

      if (profile === 'background' || profile === 'normal') {
        return [];
      }

      return queryFn();
    },
  );

  const loggerMock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const setVapidDetailsMock = options?.throwOnSetVapidDetails
    ? vi.fn(() => {
        throw new Error('setVapidDetails failed');
      })
    : vi.fn();

  setCjsModule(dbModulePath, {
    pool: {},
    dbResilience: {},
    QUERY_TIMEOUT_PROFILES: {},
    runDbQuery: runDbQueryMock,
    getPoolStats: vi.fn(),
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => []),
          })),
        })),
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
    logger: loggerMock,
  });

  setCjsModule(webPushModulePath, {
    __esModule: true,
    default: {
      setVapidDetails: setVapidDetailsMock,
      sendNotification: vi.fn(async () => undefined),
      generateVAPIDKeys: vi.fn(() => ({
        publicKey: 'generated-public-key',
        privateKey: 'generated-private-key',
      })),
    },
  });

  return { runDbQueryMock, setVapidDetailsMock, loggerMock };
}

function loadNotificationModule(): NotificationServiceModule {
  delete cjsRequire.cache[notificationModulePath];
  return cjsRequire(notificationModulePath) as NotificationServiceModule;
}

describe('server/notification-service.js - iteration 15 uncovered branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    delete process.env.PUSH_BATCH_SIZE;
  });

  it('logs warning and exposes empty VAPID public key when VAPID config is missing', () => {
    const deps = setupNotificationDependencies({ pushEnabled: false });
    const { NotificationService } = loadNotificationModule();

    const service = new NotificationService();

    expect(deps.loggerMock.warn).toHaveBeenCalledWith(
      '[Notifications] Configuration VAPID absente, envoi push désactivé',
    );
    expect(service.getVapidPublicKey()).toBe('');
  });

  it('logs error when setVapidDetails throws during module init', () => {
    const deps = setupNotificationDependencies({ throwOnSetVapidDetails: true });
    loadNotificationModule();

    expect(deps.setVapidDetailsMock).toHaveBeenCalledTimes(1);
    expect(deps.loggerMock.error).toHaveBeenCalledWith(
      '[Notifications] Échec configuration VAPID, push désactivé',
      expect.objectContaining({
        error: expect.any(Error),
      }),
    );
  });

  it('loads subscriptions from background query and maps userEmail fallback to undefined', async () => {
    const deps = setupNotificationDependencies({
      runDbQueryImpl: async (_queryFn, profile) => {
        if (profile === 'background') {
          return [
            {
              endpoint: 'https://push.example/sub/with-user',
              p256dh: 'k1',
              auth: 'a1',
              userEmail: 'member@example.com',
            },
            {
              endpoint: 'https://push.example/sub/without-user',
              p256dh: 'k2',
              auth: 'a2',
              userEmail: '',
            },
          ];
        }
        return [];
      },
    });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternal(service);

    await service.loadSubscriptions();

    expect(deps.runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'background');
    expect(internal.isLoaded).toBe(true);
    expect(internal.subscriptions.get('https://push.example/sub/with-user')?.userId).toBe(
      'member@example.com',
    );
    expect(internal.subscriptions.get('https://push.example/sub/without-user')?.userId).toBeUndefined();
  });

  it('returns false from addSubscription when the DB select call fails', async () => {
    const deps = setupNotificationDependencies({
      runDbQueryImpl: async (_queryFn, profile) => {
        if (profile === 'background') {
          return [];
        }
        if (profile === 'normal') {
          throw new Error('select failed');
        }
        return undefined;
      },
    });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const added = await service.addSubscription({
      endpoint: 'https://push.example/sub/fail-on-select',
      p256dh: 'key',
      auth: 'auth',
    });

    expect(added).toBe(false);
    expect(deps.runDbQueryMock.mock.calls.some((call) => call[1] === 'normal')).toBe(true);
  });

  it('counts rejected sendToSubscription promises as failed in sendToAll aggregation', async () => {
    setupNotificationDependencies({ pushEnabled: true });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternal(service);

    internal.isLoaded = true;
    internal.subscriptions.set('https://push.example/sub/1', {
      endpoint: 'https://push.example/sub/1',
      p256dh: 'k1',
      auth: 'a1',
    });
    internal.subscriptions.set('https://push.example/sub/2', {
      endpoint: 'https://push.example/sub/2',
      p256dh: 'k2',
      auth: 'a2',
    });

    const sendSpy = vi
      .spyOn(service, 'sendToSubscription' as never)
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('hard failure'));

    const result = await service.sendToAll({
      title: 'Iteration 15',
      body: 'Batch rejection branch',
    });

    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sent: 1, failed: 1 });
  });

  it('parses numeric-string statusCode and returns null for non-object errors', () => {
    setupNotificationDependencies({ pushEnabled: true });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternal(service);

    expect(internal.getStatusCode({ statusCode: '404' })).toBe(404);
    expect(internal.getStatusCode('network-error')).toBeNull();
  });
});
