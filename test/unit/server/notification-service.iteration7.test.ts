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

type IdeaStatusPayload = {
  title: string;
  status: string;
};

type NotificationServiceLike = {
  loadSubscriptions: () => Promise<void>;
  sendToSubscription: (
    subscription: SubscriptionInput,
    payload: NotificationPayload,
  ) => Promise<boolean>;
  sendToAll: (payload: NotificationPayload) => Promise<{ sent: number; failed: number }>;
  notifyIdeaStatusChange: (idea: IdeaStatusPayload) => Promise<void>;
  removeSubscription: (endpoint: string) => Promise<boolean>;
};

type NotificationServiceInternals = NotificationServiceLike & {
  isLoaded: boolean;
  loadingPromise: Promise<void> | null;
  subscriptions: Map<string, SubscriptionInput>;
  getEndpointPreview: (endpoint: string) => string;
  getStatusCode: (error: unknown) => number | null;
};

type NotificationServiceModule = {
  NotificationService: new () => NotificationServiceLike;
  notificationService?: {
    loadingPromise?: Promise<unknown> | null;
  };
};

type PreparedModules = {
  serviceModule: NotificationServiceModule;
  sendNotificationSpy: ReturnType<typeof vi.spyOn>;
};

const baseSubscription: SubscriptionInput = {
  endpoint: 'https://push.example/subscription/iteration7',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
  userId: 'iteration7@example.com',
};

const basePayload: NotificationPayload = {
  title: 'Iteration 7',
  body: 'Notification body',
  data: { type: 'iteration-7' },
};

const asInternals = (service: NotificationServiceLike): NotificationServiceInternals => {
  return service as unknown as NotificationServiceInternals;
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
  process.env.VAPID_SUBJECT = 'mailto:iteration7@example.com';
};

const prepareModules = async (vapidEnabled = true): Promise<PreparedModules> => {
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

  // Stabilise les tests: le module démarre un chargement async via singleton exporté.
  // On attend la fin (ou l'échec) pour éviter les erreurs de teardown Vitest.
  if (serviceModule.notificationService?.loadingPromise) {
    await serviceModule.notificationService.loadingPromise.catch(() => undefined);
  }

  return { serviceModule, sendNotificationSpy };
};

describe('server/notification-service.js - iteration 7 targeted branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns existing loadingPromise when one is already in progress', async () => {
    const { serviceModule } = await prepareModules(true);

    const service = new serviceModule.NotificationService();
    const internal = asInternals(service);

    const pendingPromise = Promise.resolve();
    internal.loadingPromise = pendingPromise;

    const secondLoadPromise = service.loadSubscriptions();
    expect(internal.loadingPromise).toBe(pendingPromise);

    await secondLoadPromise;
  });

  it('falls back to degraded mode when DB loader throws a non-Error value', async () => {
    const { serviceModule } = await prepareModules(true);
    const dbModule = await import('../../../server/db.js');
    vi.spyOn(dbModule, 'runDbQuery').mockRejectedValue('database-unavailable');
    const service = new serviceModule.NotificationService();
    const internal = asInternals(service);

    await service.loadSubscriptions();

    expect(internal.isLoaded).toBe(true);
    expect(internal.loadingPromise).toBeNull();
    expect(internal.subscriptions.size).toBe(0);
  });

  it('returns false without removing subscription when push error has no statusCode', async () => {
    const { serviceModule, sendNotificationSpy } = await prepareModules(true);
    const service = new serviceModule.NotificationService();

    sendNotificationSpy.mockRejectedValueOnce({ message: 'temporary transport failure' });
    const removeSpy = vi.spyOn(service, 'removeSubscription').mockResolvedValue(true);

    const result = await service.sendToSubscription(baseSubscription, basePayload);

    expect(result).toBe(false);
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('uses mapped and fallback titles for idea status change notifications', async () => {
    const { serviceModule } = await prepareModules(true);
    const service = new serviceModule.NotificationService();

    const sendToAllSpy = vi.spyOn(service, 'sendToAll').mockResolvedValue({ sent: 0, failed: 0 });

    await service.notifyIdeaStatusChange({ title: 'Idée A', status: 'approuvée' });
    await service.notifyIdeaStatusChange({ title: 'Idée B', status: 'statut-inconnu' });

    expect(sendToAllSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: '✅ Votre idée a été approuvée' }),
    );
    expect(sendToAllSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: 'Statut de votre idée mis à jour' }),
    );
  });

  it('returns truncated endpoint preview and null status code for object without statusCode', async () => {
    const { serviceModule } = await prepareModules(true);
    const service = new serviceModule.NotificationService();
    const internal = asInternals(service);

    const longEndpoint = `https://push.example/${'x'.repeat(120)}`;
    const preview = internal.getEndpointPreview(longEndpoint);
    const statusCode = internal.getStatusCode({ message: 'missing-status-code' });

    expect(preview.endsWith('...')).toBe(true);
    expect(preview.length).toBe(63);
    expect(statusCode).toBeNull();
  });
});
