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
  data?: Record<string, string>;
  actions?: Array<{ action: string; title: string }>;
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

const prepareModules = async (vapidEnabled: boolean): Promise<PreparedModules> => {
  vi.resetModules();
  await configureVapidEnv(vapidEnabled);

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

describe('server/notification-service.js - iteration 3 targeted tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sendToSubscription returns true when web-push send succeeds', async () => {
    const { serviceModule, sendNotificationSpy } = await prepareModules(true);
    const service = new serviceModule.NotificationService();

    const result = await service.sendToSubscription(baseSubscription, basePayload);

    expect(result).toBe(true);
    expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
  });

  it('sendToSubscription removes subscription on permanent error status', async () => {
    const { serviceModule, sendNotificationSpy } = await prepareModules(true);
    const service = new serviceModule.NotificationService();

    sendNotificationSpy.mockRejectedValueOnce({
      statusCode: 410,
      message: 'Gone',
    });

    const removeSpy = vi.spyOn(service, 'removeSubscription').mockResolvedValue(true);

    const result = await service.sendToSubscription(baseSubscription, basePayload);

    expect(result).toBe(false);
    expect(removeSpy).toHaveBeenCalledWith(baseSubscription.endpoint);
  });

  it('sendToSubscription keeps subscription on non-permanent error status', async () => {
    const { serviceModule, sendNotificationSpy } = await prepareModules(true);
    const service = new serviceModule.NotificationService();

    sendNotificationSpy.mockRejectedValueOnce({
      statusCode: 503,
      message: 'Service Unavailable',
    });

    const removeSpy = vi.spyOn(service, 'removeSubscription').mockResolvedValue(true);

    const result = await service.sendToSubscription(baseSubscription, basePayload);

    expect(result).toBe(false);
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('sendToAll returns all failed when VAPID config is absent', async () => {
    const { serviceModule, sendNotificationSpy } = await prepareModules(false);
    const service = new serviceModule.NotificationService();
    const internalService = asInternal(service);

    internalService.isLoaded = true;
    internalService.subscriptions.set('sub-1', {
      endpoint: 'https://push.example/subscription/1',
      p256dh: 'k1',
      auth: 'a1',
    });
    internalService.subscriptions.set('sub-2', {
      endpoint: 'https://push.example/subscription/2',
      p256dh: 'k2',
      auth: 'a2',
    });

    const result = await service.sendToAll(basePayload);

    expect(result).toEqual({ sent: 0, failed: 2 });
    expect(sendNotificationSpy).not.toHaveBeenCalled();
  });

  it('sendToAll aggregates sent and failed results with active subscriptions', async () => {
    const { serviceModule } = await prepareModules(true);
    const service = new serviceModule.NotificationService();
    const internalService = asInternal(service);

    internalService.isLoaded = true;
    internalService.subscriptions.set('sub-1', {
      endpoint: 'https://push.example/subscription/1',
      p256dh: 'k1',
      auth: 'a1',
    });
    internalService.subscriptions.set('sub-2', {
      endpoint: 'https://push.example/subscription/2',
      p256dh: 'k2',
      auth: 'a2',
    });

    const sendSpy = vi
      .spyOn(service, 'sendToSubscription')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await service.sendToAll(basePayload);

    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });
});
