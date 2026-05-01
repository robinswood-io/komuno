import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string;
};

type NotificationServiceLike = {
  ensureLoaded: () => Promise<void>;
  loadSubscriptions: () => Promise<void>;
  addSubscription: (subscription: SubscriptionInput) => Promise<boolean>;
  sendToAll: (payload: { title: string; body: string }) => Promise<{ sent: number; failed: number }>;
  startBackgroundLoad: () => void;
};

type NotificationServiceInternal = NotificationServiceLike & {
  isLoaded: boolean;
  subscriptions: Map<string, SubscriptionInput>;
  getEndpointPreview: (endpoint: string) => string;
  getStatusCode: (error: unknown) => number | null;
};

type NotificationServiceModule = {
  NotificationService: new () => NotificationServiceLike;
};

const asInternal = (service: NotificationServiceLike): NotificationServiceInternal => {
  return service as unknown as NotificationServiceInternal;
};

const configureVapidEnv = async (): Promise<void> => {
  const webPushModule = await import('web-push');
  const vapidKeys = webPushModule.default.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:iteration8@example.com';
};

const prepareModules = async (): Promise<NotificationServiceModule> => {
  vi.resetModules();
  await configureVapidEnv();

  const loggerModule = await import('../../../server/lib/logger.js');
  const webPushModule = await import('web-push');

  vi.spyOn(loggerModule.logger, 'info').mockImplementation(() => undefined);
  vi.spyOn(loggerModule.logger, 'warn').mockImplementation(() => undefined);
  vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => undefined);
  vi.spyOn(webPushModule.default, 'setVapidDetails').mockImplementation(() => undefined);
  vi.spyOn(webPushModule.default, 'sendNotification').mockResolvedValue(undefined);

  const serviceModule = (await import('../../../server/notification-service.js')) as NotificationServiceModule;
  return serviceModule;
};

describe('server/notification-service.js - iteration 8 targeted branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    try {
      await vi.runAllTimersAsync();
    } catch {
      // No fake timers active for this test; nothing to flush.
    }
    vi.useRealTimers();
  });

  it('ensureLoaded triggers loadSubscriptions when service is not loaded', async () => {
    const serviceModule = await prepareModules();
    const service = new serviceModule.NotificationService();
    const internal = asInternal(service);

    internal.isLoaded = false;
    const loadSpy = vi.spyOn(service, 'loadSubscriptions').mockResolvedValue(undefined);

    await service.ensureLoaded();

    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('addSubscription returns false for invalid subscription payload', async () => {
    const serviceModule = await prepareModules();
    const service = new serviceModule.NotificationService();

    vi.spyOn(service, 'ensureLoaded').mockResolvedValue(undefined);

    const result = await service.addSubscription({
      endpoint: '',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    });

    expect(result).toBe(false);
  });

  it('ensureLoaded does not call loadSubscriptions when already loaded', async () => {
    const serviceModule = await prepareModules();
    const service = new serviceModule.NotificationService();
    const internal = asInternal(service);

    internal.isLoaded = true;
    const loadSpy = vi.spyOn(service, 'loadSubscriptions').mockResolvedValue(undefined);

    await service.ensureLoaded();

    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('startBackgroundLoad catches rejected loadSubscriptions without throwing', async () => {
    const serviceModule = await prepareModules();
    const service = new serviceModule.NotificationService();

    vi.useFakeTimers();
    vi.spyOn(service, 'loadSubscriptions').mockRejectedValue(new Error('background-load-failed'));

    expect(() => service.startBackgroundLoad()).not.toThrow();
    await vi.runAllTimersAsync();
    await Promise.resolve();
  });

  it('sendToAll returns immediately with zero counts when no subscriptions exist', async () => {
    const serviceModule = await prepareModules();
    const service = new serviceModule.NotificationService();
    const internal = asInternal(service);

    internal.isLoaded = true;
    internal.subscriptions.clear();

    const result = await service.sendToAll({
      title: 'No subscribers',
      body: 'No-op',
    });

    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it('covers endpoint short preview and status code parsing branches', async () => {
    const serviceModule = await prepareModules();
    const service = new serviceModule.NotificationService();
    const internal = asInternal(service);

    const shortPreview = internal.getEndpointPreview('https://push.example/sub-short');
    const numericStatus = internal.getStatusCode({ statusCode: 400 });
    const stringStatus = internal.getStatusCode({ statusCode: '404' });

    expect(shortPreview).toBe('https://push.example/sub-short');
    expect(numericStatus).toBe(400);
    expect(stringStatus).toBe(404);
  });
});
