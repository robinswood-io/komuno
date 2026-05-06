import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type AdminRecord = { isActive: boolean; status: string; email: string };
type ServiceResult = { success: boolean; data?: unknown; error?: Error };

type ServiceLike = {
  notifyNewEvent: (event: { title: string }, organizerName: string) => Promise<ServiceResult>;
  testEmailConfiguration: () => Promise<ServiceResult>;
  updateContext: (newContext: { baseUrl?: string; adminDashboardUrl?: string }) => void;
  context: { baseUrl: string; adminDashboardUrl: string };
};

type ModuleLike = { emailNotificationService: ServiceLike };

const cjsRequire = createRequire(import.meta.url);
const modulePath = cjsRequire.resolve('../../../server/email-notification-service.js');
const storagePath = cjsRequire.resolve('../../../server/storage.js');
const emailServicePath = cjsRequire.resolve('../../../server/email-service.js');
const templatesPath = cjsRequire.resolve('../../../server/email-templates.js');
const loggerPath = cjsRequire.resolve('../../../server/lib/logger.js');
const schemaPath = cjsRequire.resolve('../../../shared/schema.js');

function setCjsModule(path: string, exportsValue: unknown): void {
  const previous = cjsRequire.cache[path];
  cjsRequire.cache[path] = {
    ...(previous ?? { id: path, filename: path, loaded: true, children: [], paths: [] }),
    exports: exportsValue,
  };
}

function loadService(options?: {
  admins?: AdminRecord[];
  sendEmailSuccess?: boolean;
  sendEmailErrorMessage?: string;
}) {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const storage = {
    getBrandingConfig: vi.fn(async () => ({ success: true, data: { config: {} } })),
    getAllAdmins: vi.fn(async () => ({ success: true, data: options?.admins ?? [{ isActive: true, status: 'active', email: 'admin@example.com' }] })),
    getMemberByCjdRole: vi.fn(async () => ({ success: true, data: { email: 'recruit@example.com' } })),
  };

  const sendEmail = vi.fn(async () => {
    if (options?.sendEmailSuccess === false) {
      return { success: false, error: new Error(options.sendEmailErrorMessage ?? 'smtp-failed') };
    }
    return { success: true, data: { messageId: 'msg-146' } };
  });

  const templates = {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event-subject', html: '<p>event-html</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test-subject', html: '<p>test-html</p>' })),
  };

  setCjsModule(storagePath, { storage });
  setCjsModule(emailServicePath, { emailService: { sendEmail } });
  setCjsModule(templatesPath, templates);
  setCjsModule(loggerPath, { logger });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  vi.resetModules();
  delete cjsRequire.cache[modulePath];
  const serviceModule = cjsRequire(modulePath) as ModuleLike;

  return { service: serviceModule.emailNotificationService, logger, storage, templates, sendEmail };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BASE_URL = 'https://komuno.example';
});

describe('server/email-notification-service.js iteration146', () => {
  it('exports a singleton service instance', () => {
    const loaded = loadService();
    expect(loaded.service).toBeDefined();
  });

  it('notifyNewEvent sends email using template and admin recipients', async () => {
    const loaded = loadService();

    const result = await loaded.service.notifyNewEvent({ title: 'Event 146' }, 'Organizer 146');

    expect(result.success).toBe(true);
    expect(loaded.templates.createNewEventEmailTemplate).toHaveBeenCalledWith(
      { title: 'Event 146' },
      'Organizer 146',
      expect.any(Object),
    );
    expect(loaded.sendEmail).toHaveBeenCalledWith({
      to: ['admin@example.com'],
      subject: 'event-subject',
      html: '<p>event-html</p>',
    });
  });

  it('testEmailConfiguration fails when no active administrator exists', async () => {
    const loaded = loadService({ admins: [] });

    const result = await loaded.service.testEmailConfiguration();

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error.message).toContain('Aucun administrateur actif trouvé');
    }
  });

  it('testEmailConfiguration returns failed sendEmail result and logs error path', async () => {
    const loaded = loadService({ sendEmailSuccess: false, sendEmailErrorMessage: 'smtp-down-146' });

    const result = await loaded.service.testEmailConfiguration();

    expect(result.success).toBe(false);
    expect(loaded.logger.error).toHaveBeenCalledWith(
      '[Email Notifications] Échec du test email',
      expect.objectContaining({ recipient: 'admin@example.com', error: 'Error: smtp-down-146' }),
    );
  });

  it('updateContext merges values and logs update', () => {
    const loaded = loadService();

    loaded.service.updateContext({ baseUrl: 'https://new.komuno.example' });

    expect(loaded.service.context.baseUrl).toBe('https://new.komuno.example');
    expect(loaded.logger.info).toHaveBeenCalledWith('[Email Notifications] Contexte des notifications mis à jour');
  });
});
