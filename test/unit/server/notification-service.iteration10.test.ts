import { beforeEach, describe, expect, it, vi } from 'vitest';

type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string;
};

type NotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
};

type StoredSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userEmail: string | null;
};

type NotificationServiceLike = {
  loadSubscriptions: () => Promise<void>;
  addSubscription: (subscription: SubscriptionInput) => Promise<boolean>;
  sendToSubscription: (
    subscription: SubscriptionInput,
    payload: NotificationPayload,
  ) => Promise<boolean>;
};

type NotificationServiceInternal = NotificationServiceLike & {
  isLoaded: boolean;
  subscriptions: Map<string, SubscriptionInput>;
  getStatusCode: (error: unknown) => number | null;
};

type NotificationServiceModule = {
  NotificationService: new () => NotificationServiceLike;
};

type PreparedModules = {
  serviceModule: NotificationServiceModule;
  runDbQuerySpy: ReturnType<typeof vi.spyOn>;
  sendNotificationSpy: ReturnType<typeof vi.spyOn>;
};

const asInternal = (service: NotificationServiceLike): NotificationServiceInternal => {
  return service as unknown as NotificationServiceInternal;
};

const configureVapidEnv = async (): Promise<void> => {
  const webPushModule = await import('web-push');
  const vapidKeys = webPushModule.default.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:iteration10@example.com';
};

const prepareModules = async (): Promise<PreparedModules> => {
  vi.resetModules();
  await configureVapidEnv();

  const moduleTools = await import('module');
  const require = moduleTools.createRequire(import.meta.url);
  const dbModule = require('/srv/workspace/komuno/server/db.js') as {
    runDbQuery: (...args: unknown[]) => Promise<unknown>;
  };

  const loggerModule = await import('../../../server/lib/logger.js');
  const webPushModule = await import('web-push');

  vi.spyOn(loggerModule.logger, 'info').mockImplementation(() => undefined);
  vi.spyOn(loggerModule.logger, 'warn').mockImplementation(() => undefined);
  vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => undefined);

  vi.spyOn(webPushModule.default, 'setVapidDetails').mockImplementation(() => undefined);
  const sendNotificationSpy = vi
    .spyOn(webPushModule.default, 'sendNotification')
    .mockResolvedValue(undefined);
  const runDbQuerySpy = vi.spyOn(dbModule, 'runDbQuery').mockResolvedValue([]);

  const serviceModule = (await import('../../../server/notification-service.js')) as NotificationServiceModule;

  return {
    serviceModule,
    runDbQuerySpy,
    sendNotificationSpy,
  };
};

describe('server/notification-service.js - iteration 10 targeted branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps userEmail to userId (truthy and falsy) when loading subscriptions', async () => {
    const { serviceModule, runDbQuerySpy } = await prepareModules();
    const service = new serviceModule.NotificationService();
    const internal = asInternal(service);

    const rows: StoredSubscriptionRow[] = [
      {
        endpoint: 'https://push.example/subs/with-user',
        p256dh: 'k1',
        auth: 'a1',
        userEmail: 'owner@example.com',
      },
      {
        endpoint: 'https://push.example/subs/without-user',
        p256dh: 'k2',
        auth: 'a2',
        userEmail: '',
      },
    ];

    runDbQuerySpy.mockResolvedValueOnce(rows);

    await service.loadSubscriptions();

    expect(internal.subscriptions.get(rows[0].endpoint)?.userId).toBe(
      'owner@example.com',
    );
    expect(internal.subscriptions.get(rows[1].endpoint)?.userId).toBeUndefined();
  });

  it('handles non-Error rejection during loadSubscriptions', async () => {
    const { serviceModule, runDbQuerySpy } = await prepareModules();
    const service = new serviceModule.NotificationService();
    const internal = asInternal(service);

    runDbQuerySpy.mockRejectedValueOnce('db-unavailable');

    await service.loadSubscriptions();

    expect(internal.isLoaded).toBe(true);
  });

  it('adds subscription through insert path with userId omitted', async () => {
    const { serviceModule, runDbQuerySpy } = await prepareModules();
    const service = new serviceModule.NotificationService();
    const internal = asInternal(service);

    internal.isLoaded = true;
    runDbQuerySpy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined);

    const result = await service.addSubscription({
      endpoint: 'https://push.example/subs/new',
      p256dh: 'kn',
      auth: 'an',
    });

    expect(result).toBe(true);
    expect(internal.subscriptions.has('https://push.example/subs/new')).toBe(
      true,
    );
  });

  it('adds subscription through update path with explicit userId', async () => {
    const { serviceModule, runDbQuerySpy } = await prepareModules();
    const service = new serviceModule.NotificationService();
    const internal = asInternal(service);

    internal.isLoaded = true;
    runDbQuerySpy
      .mockResolvedValueOnce([{ endpoint: 'https://push.example/subs/existing' }])
      .mockResolvedValueOnce(undefined);

    const result = await service.addSubscription({
      endpoint: 'https://push.example/subs/existing',
      p256dh: 'ke',
      auth: 'ae',
      userId: 'editor@example.com',
    });

    expect(result).toBe(true);
    expect(
      internal.subscriptions.get('https://push.example/subs/existing')?.userId,
    ).toBe('editor@example.com');
  });

  it('keeps explicit icon/badge/tag/actions and handles Error rejection branch', async () => {
    const { serviceModule, sendNotificationSpy } = await prepareModules();
    const service = new serviceModule.NotificationService();

    const subscription: SubscriptionInput = {
      endpoint: 'https://push.example/subs/payload',
      p256dh: 'kp',
      auth: 'ap',
    };
    const payload: NotificationPayload = {
      title: 'Payload branch',
      body: 'Explicit values',
      icon: '/custom/icon.svg',
      badge: '/custom/badge.svg',
      tag: 'custom-tag',
      data: { scope: 'iteration-10' },
      actions: [{ action: 'open', title: 'Ouvrir' }],
    };

    const success = await service.sendToSubscription(subscription, payload);
    expect(success).toBe(true);

    const serializedPayload = sendNotificationSpy.mock.calls[0]?.[1];
    expect(typeof serializedPayload).toBe('string');
    const parsedPayload = JSON.parse(serializedPayload as string) as {
      icon: string;
      badge: string;
      tag: string;
      actions: Array<{ action: string; title: string }>;
    };
    expect(parsedPayload.icon).toBe('/custom/icon.svg');
    expect(parsedPayload.badge).toBe('/custom/badge.svg');
    expect(parsedPayload.tag).toBe('custom-tag');
    expect(parsedPayload.actions).toEqual([{ action: 'open', title: 'Ouvrir' }]);

    sendNotificationSpy.mockRejectedValueOnce(new Error('push-error'));
    const failed = await service.sendToSubscription(subscription, payload);
    expect(failed).toBe(false);
  });

  it('returns null status code when error is null', async () => {
    const { serviceModule } = await prepareModules();
    const service = new serviceModule.NotificationService();
    const internal = asInternal(service);

    expect(internal.getStatusCode(null)).toBeNull();
  });
});
