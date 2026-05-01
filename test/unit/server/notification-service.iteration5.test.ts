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

type RuntimeNotificationPayload = NotificationPayload & {
  data?: unknown;
  actions?: unknown;
};

type PushSubscriptionInternal = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string;
  createdAt?: Date;
};

type NotificationServiceLike = {
  sendToSubscription: (
    subscription: SubscriptionInput,
    payload: NotificationPayload,
  ) => Promise<boolean>;
  sendToAll: (payload: NotificationPayload) => Promise<{ sent: number; failed: number }>;
  removeSubscription: (endpoint: string) => Promise<boolean>;
};

type NotificationServiceInternal = NotificationServiceLike & {
  subscriptions: Map<string, PushSubscriptionInternal>;
  isLoaded: boolean;
  batchSize: number;
};

type NotificationServiceModule = {
  NotificationService: new () => NotificationServiceLike;
};

type PreparedModules = {
  serviceModule: NotificationServiceModule;
  sendNotificationSpy: ReturnType<typeof vi.spyOn>;
};

const baseSubscription: SubscriptionInput = {
  endpoint: 'https://push.example/subscription/123',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
  userId: 'user@example.com',
};

const basePayload: NotificationPayload = {
  title: 'Test notification',
  body: 'Body',
  data: { type: 'test' },
};

const asInternal = (service: NotificationServiceLike): NotificationServiceInternal => {
  return service as unknown as NotificationServiceInternal;
};

const configureVapidEnv = async (enabled: boolean): Promise<void> => {
  if (!enabled) {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    return;
  }

  const webPushModule = await import('web-push');
  const vapidKeys = webPushModule.default.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
};

const prepareModules = async (
  vapidEnabled: boolean,
  batchSize?: string,
): Promise<PreparedModules> => {
  vi.resetModules();
  await configureVapidEnv(vapidEnabled);

  if (batchSize === undefined) {
    delete process.env.PUSH_BATCH_SIZE;
  } else {
    process.env.PUSH_BATCH_SIZE = batchSize;
  }

  const loggerModule = await import('../../../server/lib/logger.js');
  const webPushModule = await import('web-push');

  const sendNotificationSpy = vi
    .spyOn(webPushModule.default, 'sendNotification')
    .mockResolvedValue(undefined);
  vi.spyOn(webPushModule.default, 'setVapidDetails').mockImplementation(() => undefined);

  vi.spyOn(loggerModule.logger, 'info').mockImplementation(() => undefined);
  vi.spyOn(loggerModule.logger, 'warn').mockImplementation(() => undefined);
  vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => undefined);

  const serviceModule = (await import('../../../server/notification-service.js')) as NotificationServiceModule;

  return {
    serviceModule,
    sendNotificationSpy,
  };
};

describe('server/notification-service.js - iteration 5 targeted tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.PUSH_BATCH_SIZE;
  });

  it('normalizes empty icon, badge, tag and invalid data/actions payloads', async () => {
    const { serviceModule, sendNotificationSpy } = await prepareModules(true);
    const service = new serviceModule.NotificationService();

    const runtimePayload: RuntimeNotificationPayload = {
      title: 'Runtime payload',
      body: 'Body',
      icon: '   ',
      badge: '',
      tag: '   ',
      data: null,
      actions: { action: 'invalid-shape' },
    };

    const result = await service.sendToSubscription(
      baseSubscription,
      runtimePayload as unknown as NotificationPayload,
    );

    expect(result).toBe(true);
    expect(sendNotificationSpy).toHaveBeenCalledTimes(1);

    const secondArg = sendNotificationSpy.mock.calls[0]?.[1];
    expect(typeof secondArg).toBe('string');
    const serialized = secondArg as string;
    const parsedPayload = JSON.parse(serialized) as {
      icon: string;
      badge: string;
      tag: string;
      data: Record<string, unknown>;
      actions: unknown[];
    };

    expect(parsedPayload.icon).toBe('/icon-192.svg');
    expect(parsedPayload.badge).toBe('/icon-192.svg');
    expect(parsedPayload.tag).toBe('default');
    expect(parsedPayload.data).toEqual({});
    expect(parsedPayload.actions).toEqual([]);
  });

  it('removes subscription when statusCode is a numeric string', async () => {
    const { serviceModule, sendNotificationSpy } = await prepareModules(true);
    const service = new serviceModule.NotificationService();

    sendNotificationSpy.mockRejectedValueOnce({
      statusCode: '410',
      message: 'Gone',
    });

    const removeSpy = vi.spyOn(service, 'removeSubscription').mockResolvedValue(true);

    const result = await service.sendToSubscription(baseSubscription, basePayload);

    expect(result).toBe(false);
    expect(removeSpy).toHaveBeenCalledWith(baseSubscription.endpoint);
  });

  it('keeps subscription when statusCode is a non-numeric string', async () => {
    const { serviceModule, sendNotificationSpy } = await prepareModules(true);
    const service = new serviceModule.NotificationService();

    sendNotificationSpy.mockRejectedValueOnce({
      statusCode: 'invalid-status',
      message: 'Temporary failure',
    });

    const removeSpy = vi.spyOn(service, 'removeSubscription').mockResolvedValue(true);

    const result = await service.sendToSubscription(baseSubscription, basePayload);

    expect(result).toBe(false);
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('caps PUSH_BATCH_SIZE to 100 for large configured values', async () => {
    const { serviceModule } = await prepareModules(true, '500');
    const service = new serviceModule.NotificationService();
    const internalService = asInternal(service);

    internalService.isLoaded = true;
    for (let index = 0; index < 101; index += 1) {
      internalService.subscriptions.set(`sub-${index}`, {
        endpoint: `https://push.example/subscription/${index}`,
        p256dh: `k-${index}`,
        auth: `a-${index}`,
      });
    }

    expect(internalService.batchSize).toBe(100);

    const sendSpy = vi.spyOn(service, 'sendToSubscription').mockResolvedValue(true);
    const result = await service.sendToAll(basePayload);

    expect(result).toEqual({ sent: 101, failed: 0 });
    expect(sendSpy).toHaveBeenCalledTimes(101);
  });
});
