import { beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
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
  addSubscription: (subscription: PushSubscriptionInput) => Promise<boolean>;
  removeSubscription: (endpoint: string) => Promise<boolean>;
  sendToAll: (payload: NotificationPayload) => Promise<{ sent: number; failed: number }>;
  sendToSubscription: (
    subscription: PushSubscriptionInput,
    payload: NotificationPayload,
  ) => Promise<boolean>;
  notifyNewIdea: (idea: { title: string; proposedBy: string }) => Promise<void>;
  notifyNewEvent: (event: { title: string; date: string; location: string }) => Promise<void>;
  notifyNewLoanItem: (loanItem: { title: string; lenderName: string }) => Promise<void>;
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
  pushEnabled?: boolean;
  batchSize?: string;
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
    process.env.VAPID_PUBLIC_KEY = 'mock-public-key';
    process.env.VAPID_PRIVATE_KEY = 'mock-private-key';
    process.env.VAPID_SUBJECT = 'mailto:iteration12@example.com';
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

  const loggerMock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

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
      setVapidDetails: vi.fn(),
      sendNotification: sendNotificationMock,
      generateVAPIDKeys: vi.fn(() => ({
        publicKey: 'generated-public-key',
        privateKey: 'generated-private-key',
      })),
    },
  });

  return { runDbQueryMock, sendNotificationMock, loggerMock };
}

function loadNotificationModule(): NotificationServiceModule {
  delete cjsRequire.cache[notificationModulePath];
  return cjsRequire(notificationModulePath) as NotificationServiceModule;
}

describe('push notification templates iteration 12 (fallback notification-service.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    delete process.env.PUSH_BATCH_SIZE;
  });

  it('documents fallback target when push-notification-templates.js is absent', async () => {
    expect(existsSync('/srv/workspace/komuno/server/push-notification-templates.js')).toBe(false);

    setupNotificationDependencies({ pushEnabled: true });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    expect(typeof service.notifyNewIdea).toBe('function');
    expect(typeof service.notifyNewEvent).toBe('function');
    expect(typeof service.notifyNewLoanItem).toBe('function');
  });

  it('addSubscription returns false for invalid subscription payload', async () => {
    const { runDbQueryMock } = setupNotificationDependencies({ pushEnabled: true });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const result = await service.addSubscription({
      endpoint: 'https://push.example/sub/invalid',
      p256dh: '',
      auth: 'token',
    });

    expect(result).toBe(false);
    expect(runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'background');
  });

  it('addSubscription inserts a new subscription when endpoint does not exist', async () => {
    const { runDbQueryMock } = setupNotificationDependencies({
      pushEnabled: true,
      runDbQueryImpl: async (_queryFn, profile) => {
        if (profile === 'background') {
          return [];
        }
        if (profile === 'normal') {
          return [];
        }
        return undefined;
      },
    });

    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const result = await service.addSubscription({
      endpoint: 'https://push.example/sub/new',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
      userId: 'member@komuno.test',
    });

    expect(result).toBe(true);
    expect(runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'normal');
    expect(runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'complex');
    expect(asInternals(service).subscriptions.has('https://push.example/sub/new')).toBe(true);
  });

  it('addSubscription updates existing subscription when endpoint already exists', async () => {
    const { runDbQueryMock } = setupNotificationDependencies({
      pushEnabled: true,
      runDbQueryImpl: async (_queryFn, profile) => {
        if (profile === 'background') {
          return [];
        }
        if (profile === 'normal') {
          return [{ endpoint: 'https://push.example/sub/existing' }];
        }
        return undefined;
      },
    });

    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const result = await service.addSubscription({
      endpoint: 'https://push.example/sub/existing',
      p256dh: 'next-p256dh',
      auth: 'next-auth',
      userId: 'updated@komuno.test',
    });

    expect(result).toBe(true);
    expect(runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'normal');
    expect(runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'complex');
    expect(asInternals(service).subscriptions.get('https://push.example/sub/existing')?.userId).toBe(
      'updated@komuno.test',
    );
  });

  it('sendToAll returns failed count for all cached subscriptions when push is disabled', async () => {
    const { sendNotificationMock } = setupNotificationDependencies({ pushEnabled: false });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternals(service);

    internal.subscriptions.set('s1', {
      endpoint: 'https://push.example/sub/1',
      p256dh: 'k1',
      auth: 'a1',
    });
    internal.subscriptions.set('s2', {
      endpoint: 'https://push.example/sub/2',
      p256dh: 'k2',
      auth: 'a2',
    });

    const result = await service.sendToAll({
      title: 'Maintenance',
      body: 'Message test',
    });

    expect(result).toEqual({ sent: 0, failed: 2 });
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it('sendToAll batches results using batchSize and aggregates sent/failed counters', async () => {
    setupNotificationDependencies({
      pushEnabled: true,
      batchSize: '2',
    });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternals(service);

    internal.subscriptions.set('b1', { endpoint: 'b1', p256dh: 'k1', auth: 'a1' });
    internal.subscriptions.set('b2', { endpoint: 'b2', p256dh: 'k2', auth: 'a2' });
    internal.subscriptions.set('b3', { endpoint: 'b3', p256dh: 'k3', auth: 'a3' });
    internal.subscriptions.set('b4', { endpoint: 'b4', p256dh: 'k4', auth: 'a4' });
    internal.subscriptions.set('b5', { endpoint: 'b5', p256dh: 'k5', auth: 'a5' });

    const sendSpy = vi
      .spyOn(service, 'sendToSubscription')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await service.sendToAll({
      title: 'Batch test',
      body: 'payload',
    });

    expect(internal.batchSize).toBe(2);
    expect(sendSpy).toHaveBeenCalledTimes(5);
    expect(result).toEqual({ sent: 3, failed: 2 });
  });

  it('sendToSubscription sanitizes icon/badge/tag/data/actions before send', async () => {
    const { sendNotificationMock } = setupNotificationDependencies({ pushEnabled: true });
    sendNotificationMock.mockResolvedValue(undefined);
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const malformedPayload = {
      title: 'Titre',
      body: 'Body',
      icon: '   ',
      badge: '',
      tag: '  ',
      data: ['invalid-array'],
      actions: 'invalid-actions',
    } as unknown as NotificationPayload;

    const sent = await service.sendToSubscription(
      {
        endpoint: 'https://push.example/sub/sanitize',
        p256dh: 'sanitize-key',
        auth: 'sanitize-auth',
      },
      malformedPayload,
    );

    expect(sent).toBe(true);
    expect(sendNotificationMock).toHaveBeenCalledTimes(1);

    const serializedPayload = sendNotificationMock.mock.calls[0]?.[1];
    expect(typeof serializedPayload).toBe('string');

    const parsed = JSON.parse(String(serializedPayload)) as {
      icon: string;
      badge: string;
      tag: string;
      data: Record<string, unknown>;
      actions: unknown[];
    };

    expect(parsed.icon).toBe('/icon-192.svg');
    expect(parsed.badge).toBe('/icon-192.svg');
    expect(parsed.tag).toBe('default');
    expect(parsed.data).toEqual({});
    expect(parsed.actions).toEqual([]);
  });

  it('sendToSubscription removes permanent-failure subscription and keeps temporary ones', async () => {
    const { sendNotificationMock } = setupNotificationDependencies({ pushEnabled: true });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const removeSpy = vi.spyOn(service, 'removeSubscription').mockResolvedValue(true);

    sendNotificationMock.mockRejectedValueOnce({ statusCode: '410', message: 'Gone' });
    sendNotificationMock.mockRejectedValueOnce({ statusCode: 503, message: 'Unavailable' });

    const first = await service.sendToSubscription(
      {
        endpoint: 'https://push.example/sub/permanent',
        p256dh: 'k1',
        auth: 'a1',
      },
      { title: 'A', body: 'B' },
    );
    const second = await service.sendToSubscription(
      {
        endpoint: 'https://push.example/sub/temporary',
        p256dh: 'k2',
        auth: 'a2',
      },
      { title: 'C', body: 'D' },
    );

    expect(first).toBe(false);
    expect(second).toBe(false);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith('https://push.example/sub/permanent');
  });
});
