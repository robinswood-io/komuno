import { beforeEach, describe, expect, it, vi } from 'vitest';

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

type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string;
};

type NotificationServiceLike = {
  notifyIdeaStatusChange: (idea: IdeaStatusPayload) => Promise<void>;
  sendToAll: (payload: NotificationPayload) => Promise<{ sent: number; failed: number }>;
  sendToSubscription: (
    subscription: SubscriptionInput,
    payload: NotificationPayload,
  ) => Promise<boolean>;
};

type NotificationServiceModule = {
  NotificationService: new () => NotificationServiceLike;
};

const configureVapidEnv = async (): Promise<void> => {
  const webPushModule = await import('web-push');
  const vapidKeys = webPushModule.default.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:iteration9@example.com';
};

const prepareService = async (): Promise<NotificationServiceLike> => {
  vi.resetModules();
  await configureVapidEnv();

  const loggerModule = await import('../../../server/lib/logger.js');
  vi.spyOn(loggerModule.logger, 'info').mockImplementation(() => undefined);
  vi.spyOn(loggerModule.logger, 'warn').mockImplementation(() => undefined);
  vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => undefined);

  const webPushModule = await import('web-push');
  vi.spyOn(webPushModule.default, 'setVapidDetails').mockImplementation(() => undefined);
  vi.spyOn(webPushModule.default, 'sendNotification').mockResolvedValue(undefined);

  const serviceModule = (await import('../../../server/notification-service.js')) as NotificationServiceModule;
  return new serviceModule.NotificationService();
};

describe('server push templates iteration 9', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps all known idea statuses to dedicated titles', async () => {
    const service = await prepareService();
    const sendToAllSpy = vi.spyOn(service, 'sendToAll').mockResolvedValue({ sent: 0, failed: 0 });

    const cases: Array<{ status: string; expectedTitle: string }> = [
      { status: 'approuvée', expectedTitle: '✅ Votre idée a été approuvée' },
      { status: 'rejetée', expectedTitle: '❌ Votre idée a été rejetée' },
      { status: 'en_cours_etude', expectedTitle: '🔍 Votre idée est en cours d\'étude' },
      { status: 'reportée', expectedTitle: '⏳ Votre idée a été reportée' },
      { status: 'réalisée', expectedTitle: '🎉 Votre idée a été réalisée' },
    ];

    for (const testCase of cases) {
      await service.notifyIdeaStatusChange({
        title: 'Idée test',
        status: testCase.status,
      });
    }

    expect(sendToAllSpy).toHaveBeenCalledTimes(cases.length);
    cases.forEach((testCase, index) => {
      expect(sendToAllSpy).toHaveBeenNthCalledWith(
        index + 1,
        expect.objectContaining({
          title: testCase.expectedTitle,
          body: '"Idée test"',
          tag: 'idea-status-change',
          data: { type: 'idea_status_change', status: testCase.status },
        }),
      );
    });
  });

  it('uses fallback title for unknown idea status', async () => {
    const service = await prepareService();
    const sendToAllSpy = vi.spyOn(service, 'sendToAll').mockResolvedValue({ sent: 0, failed: 0 });

    await service.notifyIdeaStatusChange({
      title: 'Idée fallback',
      status: 'inconnu',
    });

    expect(sendToAllSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Statut de votre idée mis à jour',
        body: '"Idée fallback"',
      }),
    );
  });

  it('preserves explicit push payload fields when sending to one subscription', async () => {
    const service = await prepareService();
    const webPushModule = await import('web-push');
    const sendNotificationSpy = vi.spyOn(webPushModule.default, 'sendNotification');

    const subscription: SubscriptionInput = {
      endpoint: 'https://push.example/subscription/iteration9',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
      userId: 'iteration9@example.com',
    };

    const payload: NotificationPayload = {
      title: 'Title preserved',
      body: 'Body preserved',
      icon: '/custom-icon.svg',
      badge: '/custom-badge.svg',
      tag: 'custom-tag',
      data: { scope: 'iteration-9' },
      actions: [{ action: 'open', title: 'Open' }],
    };

    const result = await service.sendToSubscription(subscription, payload);

    expect(result).toBe(true);
    const rawPayload = sendNotificationSpy.mock.calls[0]?.[1];
    expect(typeof rawPayload).toBe('string');

    const parsed = JSON.parse(rawPayload as string) as {
      icon: string;
      badge: string;
      tag: string;
      data: Record<string, unknown>;
      actions: Array<{ action: string; title: string }>;
    };

    expect(parsed.icon).toBe('/custom-icon.svg');
    expect(parsed.badge).toBe('/custom-badge.svg');
    expect(parsed.tag).toBe('custom-tag');
    expect(parsed.data).toEqual({ scope: 'iteration-9' });
    expect(parsed.actions).toEqual([{ action: 'open', title: 'Open' }]);
  });
});
