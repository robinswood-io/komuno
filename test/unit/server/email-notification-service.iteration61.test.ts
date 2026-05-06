import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = { success: boolean; data?: { config?: unknown } };
type AdminsResult = { success: boolean; data: Array<{ isActive: boolean; status: string; email: string }> };
type RecruitmentResult = { success: boolean; data: { email?: string | null } | null };
type EmailResult = { success: true; data: { messageId: string } };
type EmailNotificationServiceLike = {
  context: { baseUrl: string; adminDashboardUrl: string };
  updateContext: (next: { baseUrl?: string; adminDashboardUrl?: string }) => void;
};
type EmailNotificationServiceModule = { emailNotificationService: EmailNotificationServiceLike };

const cjsRequire = createRequire(import.meta.url);
const modulePath = cjsRequire.resolve('../../../server/email-notification-service.js');
const storagePath = cjsRequire.resolve('../../../server/storage.js');
const emailServicePath = cjsRequire.resolve('../../../server/email-service.js');
const emailTemplatesPath = cjsRequire.resolve('../../../server/email-templates.js');
const loggerPath = cjsRequire.resolve('../../../server/lib/logger.js');
const schemaPath = cjsRequire.resolve('../../../shared/schema.js');

function setCjsModule(path: string, exportsValue: unknown): void {
  const previous = cjsRequire.cache[path];
  cjsRequire.cache[path] = {
    ...(previous ?? { id: path, filename: path, loaded: true, children: [], paths: [] }),
    exports: exportsValue,
  };
}

function setupDependencies(): void {
  setCjsModule(storagePath, {
    storage: {
      getBrandingConfig: vi.fn(async (): Promise<BrandingConfigResult> => ({ success: true, data: { config: {} } })),
      getAllAdmins: vi.fn(async (): Promise<AdminsResult> => ({ success: true, data: [{ isActive: true, status: 'active', email: 'a@k.test' }] })),
      getMemberByCjdRole: vi.fn(async (): Promise<RecruitmentResult> => ({ success: true, data: { email: 'recruit@k.test' } })),
    },
  });
  setCjsModule(emailServicePath, {
    emailService: { sendEmail: vi.fn(async (): Promise<EmailResult> => ({ success: true, data: { messageId: 'msg-49' } })) },
  });
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event', html: '<p>event</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test', html: '<p>test</p>' })),
  });
  setCjsModule(loggerPath, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js iteration49', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('updateContext overrides both known URL fields together', async () => {
    setupDependencies();
    const { emailNotificationService } = loadServiceModule();

    emailNotificationService.updateContext({
      baseUrl: 'https://override.example',
      adminDashboardUrl: 'https://override.example/admin-area',
    });

    expect(emailNotificationService.context.baseUrl).toBe('https://override.example');
    expect(emailNotificationService.context.adminDashboardUrl).toBe('https://override.example/admin-area');
  });
});
