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
  sendToSubscription: (
    subscription: PushSubscriptionInput,
    payload: NotificationPayload,
  ) => Promise<boolean>;
};

type NotificationServiceInternals = NotificationServiceLike & {
  batchSize: number;
  getEndpointPreview: (endpoint: string) => string;
  getStatusCode: (error: unknown) => number | null;
};

type NotificationServiceModule = {
  NotificationService: new () => NotificationServiceLike;
};

type PreparedDeps = {
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

function setupDependencies(options?: { batchSize?: string }): PreparedDeps {
  process.env.VAPID_PUBLIC_KEY = 'iteration15-public';
  process.env.VAPID_PRIVATE_KEY = 'iteration15-private';
  process.env.VAPID_SUBJECT = 'mailto:iteration15@example.com';

  if (options?.batchSize === undefined) {
    delete process.env.PUSH_BATCH_SIZE;
  } else {
    process.env.PUSH_BATCH_SIZE = options.batchSize;
  }

  setCjsModule(dbModulePath, {
    pool: {},
    dbResilience: {},
    QUERY_TIMEOUT_PROFILES: {},
    runDbQuery: vi.fn(async (_queryFn: () => Promise<unknown> | unknown, profile: string) => {
      if (profile === 'background' || profile === 'normal') {
        return [];
      }
      return undefined;
    }),
    getPoolStats: vi.fn(),
    db: {
      select: vi.fn(() => ({ from: vi.fn(() => []) })),
      insert: vi.fn(() => ({ values: vi.fn(() => undefined) })),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => undefined) })) })),
      delete: vi.fn(() => ({ where: vi.fn(() => undefined) })),
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

  const sendNotificationMock = vi.fn();

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

  return { sendNotificationMock };
}

function loadNotificationModule(): NotificationServiceModule {
  delete cjsRequire.cache[notificationModulePath];
  return cjsRequire(notificationModulePath) as NotificationServiceModule;
}

describe('push notification templates iteration 15 (branch coverage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    delete process.env.PUSH_BATCH_SIZE;
  });

  it('sets batchSize to provided positive value under cap', async () => {
    setupDependencies({ batchSize: '42' });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    expect(asInternals(service).batchSize).toBe(42);
  });

  it('getEndpointPreview returns endpoint unchanged when length <= 60', async () => {
    setupDependencies();
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const endpoint = 'https://push.example/sub/short-endpoint';
    const preview = asInternals(service).getEndpointPreview(endpoint);

    expect(preview).toBe(endpoint);
  });

  it('getEndpointPreview truncates endpoint when length > 60', async () => {
    setupDependencies();
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const endpoint = `https://push.example/sub/${'x'.repeat(90)}`;
    const preview = asInternals(service).getEndpointPreview(endpoint);

    expect(preview.endsWith('...')).toBe(true);
    expect(preview.length).toBe(63);
  });

  it('sendToSubscription parses statusCode string and removes permanent subscription', async () => {
    const { sendNotificationMock } = setupDependencies();
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const removeSpy = vi.spyOn(service, 'removeSubscription').mockResolvedValue(true);

    sendNotificationMock.mockRejectedValueOnce({ statusCode: '404', message: 'Not Found' });

    const ok = await service.sendToSubscription(
      {
        endpoint: 'https://push.example/sub/permanent-404',
        p256dh: 'p1',
        auth: 'a1',
      },
      {
        title: 'Iteration 15',
        body: 'String status code branch',
      },
    );

    expect(ok).toBe(false);
    expect(removeSpy).toHaveBeenCalledWith('https://push.example/sub/permanent-404');
  });

  it('getStatusCode returns null for non object and for object without numeric/string statusCode', async () => {
    setupDependencies();
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternals(service);

    expect(internal.getStatusCode('network-error')).toBeNull();
    expect(internal.getStatusCode({ message: 'missing code' })).toBeNull();
    expect(internal.getStatusCode({ statusCode: { nested: true } })).toBeNull();
  });

  it('getStatusCode returns null for non numeric statusCode string', async () => {
    setupDependencies();
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const status = asInternals(service).getStatusCode({ statusCode: 'not-a-number' });

    expect(status).toBeNull();
  });
});
