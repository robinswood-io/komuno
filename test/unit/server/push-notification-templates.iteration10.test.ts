import { beforeEach, describe, expect, it, vi } from 'vitest';

type NotificationPayload = {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
};

type IdeaInput = {
  title: string;
  proposedBy: string;
};

type EventInput = {
  title: string;
  date: string;
  location: string;
};

type LoanItemInput = {
  title: string;
  lenderName: string;
};

type IdeaStatusInput = {
  title: string;
  status: string;
};

type NotificationServiceLike = {
  notifyNewIdea: (idea: IdeaInput) => Promise<void>;
  notifyNewEvent: (event: EventInput) => Promise<void>;
  notifyNewLoanItem: (loanItem: LoanItemInput) => Promise<void>;
  notifyIdeaStatusChange: (idea: IdeaStatusInput) => Promise<void>;
  sendToAll: (payload: NotificationPayload) => Promise<{ sent: number; failed: number }>;
};

type NotificationServiceModule = {
  NotificationService: new () => NotificationServiceLike;
  notificationService?: {
    loadingPromise?: Promise<unknown> | null;
  };
};

const prepareModule = async (): Promise<NotificationServiceModule> => {
  vi.resetModules();

  vi.doMock('../../../server/db.js', () => ({
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => []),
      })),
    },
    runDbQuery: vi.fn(async <T>(queryFn: () => Promise<T> | T): Promise<T> => {
      return await queryFn();
    }),
  }));

  vi.doMock('../../../server/lib/logger.js', () => ({
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  }));

  vi.doMock('web-push', () => ({
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(),
      generateVAPIDKeys: vi.fn(() => ({
        publicKey: 'public-key',
        privateKey: 'private-key',
      })),
    },
  }));

  const mod = (await import('../../../server/notification-service.js')) as NotificationServiceModule;

  // Le module démarre un chargement asynchrone via un singleton exporté.
  // On attend sa stabilisation pour éviter les erreurs de teardown Vitest.
  if (mod.notificationService?.loadingPromise) {
    await mod.notificationService.loadingPromise.catch(() => undefined);
  }

  return mod;
};

describe('server/notification-service.js push templates - iteration 10', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  it('notifyNewIdea builds expected payload template', async () => {
    const module = await prepareModule();
    const service = new module.NotificationService();

    const sendToAllSpy = vi.spyOn(service, 'sendToAll').mockResolvedValue({ sent: 1, failed: 0 });

    await service.notifyNewIdea({
      title: 'Créer un espace entraide',
      proposedBy: 'Alice',
    });

    expect(sendToAllSpy).toHaveBeenCalledWith({
      title: '💡 Nouvelle idée proposée',
      body: '"Créer un espace entraide" par Alice',
      tag: 'new-idea',
      data: { type: 'new_idea', ideaTitle: 'Créer un espace entraide' },
      actions: [
        { action: 'view', title: "Voir l'idée" },
        { action: 'vote', title: 'Voter' },
      ],
    });
  });

  it('notifyNewEvent builds expected payload template with formatted date and actions', async () => {
    const module = await prepareModule();
    const service = new module.NotificationService();

    const sendToAllSpy = vi.spyOn(service, 'sendToAll').mockResolvedValue({ sent: 1, failed: 0 });

    await service.notifyNewEvent({
      title: 'Soirée réseau',
      date: '2026-01-15T19:00:00.000Z',
      location: 'Amiens',
    });

    const payload = sendToAllSpy.mock.calls[0]?.[0];
    expect(payload).toBeDefined();
    expect(payload?.title).toBe('📅 Nouvel événement');
    expect(payload?.tag).toBe('new-event');
    expect(payload?.data).toEqual({ type: 'new_event', eventTitle: 'Soirée réseau' });
    expect(payload?.actions).toEqual([
      { action: 'view', title: "Voir l'événement" },
      { action: 'register', title: "S'inscrire" },
    ]);
    expect(payload?.body).toContain('Soirée réseau');
    expect(payload?.body).toContain('à Amiens');
  });

  it('notifyNewLoanItem builds expected payload template', async () => {
    const module = await prepareModule();
    const service = new module.NotificationService();

    const sendToAllSpy = vi.spyOn(service, 'sendToAll').mockResolvedValue({ sent: 1, failed: 0 });

    await service.notifyNewLoanItem({
      title: 'Vidéoprojecteur',
      lenderName: 'Bob',
    });

    expect(sendToAllSpy).toHaveBeenCalledWith({
      title: '📦 Nouveau matériel proposé au prêt',
      body: '"Vidéoprojecteur" prêté par Bob',
      tag: 'new-loan-item',
      data: { type: 'new_loan_item', loanItemTitle: 'Vidéoprojecteur' },
      actions: [{ action: 'view', title: 'Voir le matériel' }],
    });
  });

  it('notifyIdeaStatusChange maps known statuses and fallback template', async () => {
    const module = await prepareModule();
    const service = new module.NotificationService();

    const sendToAllSpy = vi.spyOn(service, 'sendToAll').mockResolvedValue({ sent: 1, failed: 0 });

    const cases: Array<{ status: string; expectedTitle: string }> = [
      { status: 'approuvée', expectedTitle: '✅ Votre idée a été approuvée' },
      { status: 'rejetée', expectedTitle: '❌ Votre idée a été rejetée' },
      { status: 'en_cours_etude', expectedTitle: "🔍 Votre idée est en cours d'étude" },
      { status: 'reportée', expectedTitle: '⏳ Votre idée a été reportée' },
      { status: 'réalisée', expectedTitle: '🎉 Votre idée a été réalisée' },
      { status: 'inconnu', expectedTitle: 'Statut de votre idée mis à jour' },
    ];

    for (const testCase of cases) {
      await service.notifyIdeaStatusChange({
        title: 'Idée test',
        status: testCase.status,
      });
    }

    expect(sendToAllSpy).toHaveBeenCalledTimes(cases.length);

    for (let index = 0; index < cases.length; index += 1) {
      const payload = sendToAllSpy.mock.calls[index]?.[0];
      expect(payload).toBeDefined();
      expect(payload?.title).toBe(cases[index]?.expectedTitle);
      expect(payload?.body).toBe('"Idée test"');
      expect(payload?.tag).toBe('idea-status-change');
      expect(payload?.data).toEqual({ type: 'idea_status_change', status: cases[index]?.status });
    }
  });
});
