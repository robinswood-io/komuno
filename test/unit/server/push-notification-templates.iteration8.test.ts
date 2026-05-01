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

type NotificationServiceLike = {
  notifyNewIdea: (idea: { title: string; proposedBy: string }) => Promise<void>;
  notifyNewEvent: (event: { title: string; date: string; location: string }) => Promise<void>;
  notifyNewLoanItem: (loanItem: { title: string; lenderName: string }) => Promise<void>;
  sendToAll: (payload: NotificationPayload) => Promise<{ sent: number; failed: number }>;
};

type NotificationServiceInternals = NotificationServiceLike & {
  batchSize: number;
  subscriptions: Map<string, unknown>;
  getStats: () => { totalSubscriptions: number; activeSubscriptions: number };
  getVapidPublicKey: () => string;
};

type NotificationServiceModule = {
  NotificationService: new () => NotificationServiceLike;
};

const asInternals = (service: NotificationServiceLike): NotificationServiceInternals => {
  return service as unknown as NotificationServiceInternals;
};

const configureVapidEnv = async (): Promise<void> => {
  const webPushModule = await import('web-push');
  const vapidKeys = webPushModule.default.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:iteration8@example.com';
};

const prepareService = async (batchSizeValue?: string): Promise<NotificationServiceLike> => {
  vi.resetModules();
  await configureVapidEnv();

  if (batchSizeValue === undefined) {
    delete process.env.PUSH_BATCH_SIZE;
  } else {
    process.env.PUSH_BATCH_SIZE = batchSizeValue;
  }

  const loggerModule = await import('../../../server/lib/logger.js');
  vi.spyOn(loggerModule.logger, 'info').mockImplementation(() => undefined);
  vi.spyOn(loggerModule.logger, 'warn').mockImplementation(() => undefined);
  vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => undefined);

  const webPushModule = await import('web-push');
  vi.spyOn(webPushModule.default, 'setVapidDetails').mockImplementation(() => undefined);

  const serviceModule = (await import('../../../server/notification-service.js')) as NotificationServiceModule;
  return new serviceModule.NotificationService();
};

describe('server/notification-service.js - push payload templates iteration 8', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.PUSH_BATCH_SIZE;
  });

  it('notifyNewIdea builds expected template payload', async () => {
    const service = await prepareService();
    const sendToAllSpy = vi.spyOn(service, 'sendToAll').mockResolvedValue({ sent: 0, failed: 0 });

    await service.notifyNewIdea({
      title: 'Nouvelle proposition IA',
      proposedBy: 'Camille',
    });

    expect(sendToAllSpy).toHaveBeenCalledWith({
      title: '💡 Nouvelle idée proposée',
      body: '"Nouvelle proposition IA" par Camille',
      tag: 'new-idea',
      data: { type: 'new_idea', ideaTitle: 'Nouvelle proposition IA' },
      actions: [
        { action: 'view', title: "Voir l'idée" },
        { action: 'vote', title: 'Voter' },
      ],
    });
  });

  it('notifyNewEvent builds expected template payload with french date formatting', async () => {
    const service = await prepareService();
    const sendToAllSpy = vi.spyOn(service, 'sendToAll').mockResolvedValue({ sent: 0, failed: 0 });

    await service.notifyNewEvent({
      title: 'Soirée Réseau',
      date: '2026-12-24T10:30:00.000Z',
      location: 'Amiens',
    });

    expect(sendToAllSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '📅 Nouvel événement',
        body: 'Soirée Réseau - 24 décembre 2026 à Amiens',
        tag: 'new-event',
        data: { type: 'new_event', eventTitle: 'Soirée Réseau' },
        actions: [
          { action: 'view', title: "Voir l'événement" },
          { action: 'register', title: "S'inscrire" },
        ],
      }),
    );
  });

  it('notifyNewLoanItem builds expected template payload', async () => {
    const service = await prepareService();
    const sendToAllSpy = vi.spyOn(service, 'sendToAll').mockResolvedValue({ sent: 0, failed: 0 });

    await service.notifyNewLoanItem({
      title: 'Projecteur HD',
      lenderName: 'Sophie',
    });

    expect(sendToAllSpy).toHaveBeenCalledWith({
      title: '📦 Nouveau matériel proposé au prêt',
      body: '"Projecteur HD" prêté par Sophie',
      tag: 'new-loan-item',
      data: { type: 'new_loan_item', loanItemTitle: 'Projecteur HD' },
      actions: [{ action: 'view', title: 'Voir le matériel' }],
    });
  });

  it('uses fallback batch size 10 for invalid PUSH_BATCH_SIZE and reports stats/public key', async () => {
    const service = await prepareService('invalid-number');
    const internal = asInternals(service);

    expect(internal.batchSize).toBe(10);

    internal.subscriptions.set('sub-1', { endpoint: 'https://push.example/sub/1' });
    internal.subscriptions.set('sub-2', { endpoint: 'https://push.example/sub/2' });

    expect(internal.getStats()).toEqual({
      totalSubscriptions: 2,
      activeSubscriptions: 2,
    });

    expect(internal.getVapidPublicKey().length).toBeGreaterThan(0);
  });
});
