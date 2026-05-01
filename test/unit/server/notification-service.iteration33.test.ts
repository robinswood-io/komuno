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
  sendToAll: (payload: NotificationPayload) => Promise<{ sent: number; failed: number }>;
  sendToSubscription: (subscription: PushSubscriptionInput, payload: NotificationPayload) => Promise<boolean>;
  removeSubscription: (endpoint: string) => Promise<boolean>;
  notifyNewIdea: (idea: { title: string; proposedBy: string }) => Promise<void>;
  notifyNewEvent: (event: { title: string; date: string; location: string }) => Promise<void>;
  notifyNewLoanItem: (loanItem: { title: string; lenderName: string }) => Promise<void>;
  notifyIdeaStatusChange: (idea: { title: string; status: string }) => Promise<void>;
  getVapidPublicKey: () => string;
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

type RunDbQueryImpl = (
  queryFn: () => Promise<unknown> | unknown,
  profile: string,
) => Promise<unknown>;

type PreparedDeps = {
  runDbQueryMock: ReturnType<typeof vi.fn<RunDbQueryImpl>>;
  sendNotificationMock: ReturnType<typeof vi.fn>;
  loggerMock: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
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

function setupNotificationDependencies(options?: {
  pushEnabled?: boolean;
  runDbQueryImpl?: RunDbQueryImpl;
}): PreparedDeps {
  if (options?.pushEnabled === false) {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  } else {
    process.env.VAPID_PUBLIC_KEY = 'iteration33-public-key';
    process.env.VAPID_PRIVATE_KEY = 'iteration33-private-key';
    process.env.VAPID_SUBJECT = 'mailto:iteration33@example.com';
  }

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

  const sendNotificationMock = vi.fn(async () => undefined);

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

  setCjsModule(loggerModulePath, { logger: loggerMock });

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

  return { runDbQueryMock, sendNotificationMock, loggerMock };
}

function loadNotificationModule(): NotificationServiceModule {
  delete cjsRequire.cache[notificationModulePath];
  return cjsRequire(notificationModulePath) as NotificationServiceModule;
}

describe('server/notification-service.js - iteration 33 tail branches/functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PUSH_BATCH_SIZE;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  it('covers tail helpers getVapidPublicKey, resolveBatchSize, getStatusCode edge cases', () => {
    process.env.PUSH_BATCH_SIZE = '250';
    setupNotificationDependencies({ pushEnabled: true });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternal(service);

    expect(service.getVapidPublicKey()).toBe('iteration33-public-key');
    expect(internal.batchSize).toBe(100);
    expect(internal.resolveBatchSize('abc')).toBe(10);
    expect(internal.resolveBatchSize('0')).toBe(10);
    expect(internal.resolveBatchSize('35')).toBe(35);
    expect(internal.getStatusCode(42)).toBeNull();
    expect(internal.getStatusCode({ statusCode: 404 })).toBe(404);
    expect(internal.getStatusCode({ statusCode: 'NaN' })).toBeNull();
    expect(internal.getStatusCode({ statusCode: '410' })).toBe(410);
  });

  it('returns early with empty counters when there is no subscription', async () => {
    setupNotificationDependencies({ pushEnabled: true });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternal(service);
    internal.isLoaded = true;

    const result = await service.sendToAll({ title: 'Aucun', body: 'abonné' });

    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it('returns failed count when push is disabled but subscriptions exist', async () => {
    setupNotificationDependencies({ pushEnabled: false });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternal(service);
    internal.isLoaded = true;
    internal.subscriptions.set('https://push.example/a', {
      endpoint: 'https://push.example/a',
      p256dh: 'k-a',
      auth: 'a-a',
    });
    internal.subscriptions.set('https://push.example/b', {
      endpoint: 'https://push.example/b',
      p256dh: 'k-b',
      auth: 'a-b',
    });

    const result = await service.sendToAll({ title: 'Désactivé', body: 'push off' });

    expect(result).toEqual({ sent: 0, failed: 2 });
  });

  it('applies default icon/badge/tag/data/actions in sendToSubscription', async () => {
    const deps = setupNotificationDependencies({ pushEnabled: true });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();

    const success = await service.sendToSubscription(
      {
        endpoint: 'https://push.example/defaults',
        p256dh: 'k-defaults',
        auth: 'a-defaults',
      },
      {
        title: 'Payload',
        body: 'Default values',
        icon: '',
        badge: '   ',
        tag: '',
        data: ['invalid'],
        actions: 'invalid',
      },
    );

    expect(success).toBe(true);
    const payloadArg = deps.sendNotificationMock.mock.calls[0]?.[1];
    expect(typeof payloadArg).toBe('string');
    const parsed = JSON.parse(payloadArg as string) as {
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

  it('removes invalid subscription on permanent push status code and returns false', async () => {
    const deps = setupNotificationDependencies({ pushEnabled: true });
    deps.sendNotificationMock.mockRejectedValueOnce({ statusCode: '410', message: 'gone' });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternal(service);
    internal.subscriptions.set('https://push.example/gone', {
      endpoint: 'https://push.example/gone',
      p256dh: 'k-gone',
      auth: 'a-gone',
    });

    const ok = await service.sendToSubscription(
      {
        endpoint: 'https://push.example/gone',
        p256dh: 'k-gone',
        auth: 'a-gone',
      },
      { title: 'Suppression', body: 'auto' },
    );

    expect(ok).toBe(false);
    expect(internal.subscriptions.has('https://push.example/gone')).toBe(false);
  });

  it('covers removeSubscription success and failure branches', async () => {
    const deps = setupNotificationDependencies({
      pushEnabled: true,
      runDbQueryImpl: async (queryFn, profile) => {
        if (profile === 'complex') {
          return queryFn();
        }
        return [];
      },
    });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const internal = asInternal(service);

    internal.subscriptions.set('https://push.example/remove-ok', {
      endpoint: 'https://push.example/remove-ok',
      p256dh: 'k-ok',
      auth: 'a-ok',
    });

    const removedOk = await service.removeSubscription('https://push.example/remove-ok');
    expect(removedOk).toBe(true);
    expect(internal.subscriptions.has('https://push.example/remove-ok')).toBe(false);

    deps.runDbQueryMock.mockImplementationOnce(async (_queryFn, profile) => {
      if (profile === 'complex') {
        throw new Error('delete failed');
      }
      return [];
    });

    const removedKo = await service.removeSubscription('https://push.example/remove-ko');
    expect(removedKo).toBe(false);
  });

  it('covers notify methods payload construction', async () => {
    setupNotificationDependencies({ pushEnabled: true });
    const { NotificationService } = loadNotificationModule();
    const service = new NotificationService();
    const sendToAllSpy = vi
      .spyOn(service, 'sendToAll')
      .mockResolvedValue({ sent: 1, failed: 0 });

    await service.notifyNewIdea({ title: 'Idée 33', proposedBy: 'Alice' });
    await service.notifyNewEvent({
      title: 'Meetup',
      date: '2026-03-21T10:00:00.000Z',
      location: 'Paris',
    });
    await service.notifyNewLoanItem({ title: 'Caméra', lenderName: 'Bob' });
    await service.notifyIdeaStatusChange({ title: 'Idée statut', status: 'réalisée' });
    await service.notifyIdeaStatusChange({ title: 'Idée inconnue', status: 'inconnu' });

    expect(sendToAllSpy).toHaveBeenCalledTimes(5);
    expect(sendToAllSpy.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        title: '💡 Nouvelle idée proposée',
        body: '"Idée 33" par Alice',
      }),
    );
    expect(sendToAllSpy.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        title: '📅 Nouvel événement',
        body: expect.stringContaining('Meetup'),
      }),
    );
    expect(sendToAllSpy.mock.calls[2]?.[0]).toEqual(
      expect.objectContaining({
        title: '📦 Nouveau matériel proposé au prêt',
        body: '"Caméra" prêté par Bob',
      }),
    );
    expect(sendToAllSpy.mock.calls[3]?.[0]).toEqual(
      expect.objectContaining({
        title: '🎉 Votre idée a été réalisée',
      }),
    );
    expect(sendToAllSpy.mock.calls[4]?.[0]).toEqual(
      expect.objectContaining({
        title: 'Statut de votre idée mis à jour',
      }),
    );
  });
});
