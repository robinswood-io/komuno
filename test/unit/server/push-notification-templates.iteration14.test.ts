import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

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
  sendToAll: (payload: NotificationPayload) => Promise<{ sent: number; failed: number }>;
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
  setVapidDetailsMock: ReturnType<typeof vi.fn>;
  sendNotificationMock: ReturnType<typeof vi.fn>;
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
  batchSize?: string;
  throwOnSetVapidDetails?: boolean;
}): PreparedDeps {
  process.env.VAPID_PUBLIC_KEY = 'iteration14-public';
  process.env.VAPID_PRIVATE_KEY = 'iteration14-private';
  process.env.VAPID_SUBJECT = 'mailto:iteration14@example.com';

  if (options?.batchSize === undefined) {
    delete process.env.PUSH_BATCH_SIZE;
  } else {
    process.env.PUSH_BATCH_SIZE = options.batchSize;
  }

  const runDbQueryMock = vi.fn(
    async (_queryFn: () => Promise<unknown> | unknown, profile: string): Promise<unknown> => {
      if (profile === 'background' || profile === 'normal') {
        return [];
      }
      return undefined;
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
        throw new Error('VAPID config crash');
      })
    : vi.fn();

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
    logger: loggerMock,
  });

  setCjsModule(webPushModulePath, {
    __esModule: true,
    default: {
      setVapidDetails: setVapidDetailsMock,
      sendNotification: sendNotificationMock,
      generateVAPIDKeys: vi.fn(() => ({
        publicKey: 'generated-public-key',
        privateKey: 'generated-private-key',
      })),
    },
  });

  return { runDbQueryMock, setVapidDetailsMock, sendNotificationMock, loggerMock };
}

function loadNotificationModule(): NotificationServiceModule {
  delete cjsRequire.cache[notificationModulePath];
  return cjsRequire(notificationModulePath) as NotificationServiceModule;
}

describe('push notification templates iteration 14 (fallback notification-service.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    delete process.env.PUSH_BATCH_SIZE;
  });

  it('documents fallback when push-notification-templates.js is absent', () => {
    expect(existsSync('/srv/workspace/komuno/server/push-notification-templates.js')).toBe(false);
  });

  it('disables push delivery when setVapidDetails throws during module initialization', async () => {
    const deps = setupNotificationDependencies({ throwOnSetVapidDetails: true });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternals(service);

    internal.subscriptions.set('sub-err-1', {
      endpoint: 'https://push.example/sub/err-1',
      p256dh: 'k1',
      auth: 'a1',
    });
    internal.subscriptions.set('sub-err-2', {
      endpoint: 'https://push.example/sub/err-2',
      p256dh: 'k2',
      auth: 'a2',
    });

    const result = await service.sendToAll({
      title: 'Push disabled test',
      body: 'should not send',
    });

    expect(deps.setVapidDetailsMock).toHaveBeenCalledTimes(1);
    expect(deps.loggerMock.error).toHaveBeenCalledWith(
      '[Notifications] Échec configuration VAPID, push désactivé',
      expect.objectContaining({
        error: expect.any(Error),
      }),
    );
    expect(result).toEqual({ sent: 0, failed: 2 });
    expect(deps.sendNotificationMock).not.toHaveBeenCalled();
  });

  it('uses fallback batch size 10 when PUSH_BATCH_SIZE is zero', async () => {
    setupNotificationDependencies({ batchSize: '0' });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    expect(asInternals(service).batchSize).toBe(10);
  });

  it('sendToAll loads subscriptions in background profile before push-disabled early return', async () => {
    const deps = setupNotificationDependencies({ throwOnSetVapidDetails: true });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const result = await service.sendToAll({
      title: 'No active subscriptions',
      body: 'empty cache',
    });

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(deps.runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'background');
  });
});
