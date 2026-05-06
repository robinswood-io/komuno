import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = { success: boolean; data?: { config?: unknown } };
type AdminsResult = {
  success: boolean;
  data: Array<{ isActive: boolean; status: string; email: string }>;
};
type RecruitmentResult = { success: boolean; data: { email?: string | null } | null };
type EmailResult = { success: true; data: { messageId: string } };
type ServiceResult = { success: boolean; data?: unknown; error?: unknown };
type EmailNotificationServiceLike = { testEmailConfiguration: () => Promise<ServiceResult> };
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

function setupDependencies(): { sendEmailSpy: ReturnType<typeof vi.fn> } {
  const sendEmailSpy = vi.fn(async (): Promise<EmailResult> => ({ success: true, data: { messageId: 'msg-51' } }));
  setCjsModule(storagePath, {
    storage: {
      getBrandingConfig: vi.fn(async (): Promise<BrandingConfigResult> => ({ success: true, data: { config: {} } })),
      getAllAdmins: vi.fn(async (): Promise<AdminsResult> => ({
        success: true,
        data: [
          { isActive: true, status: 'active', email: ' Zed@Komuno.Test ' },
          { isActive: true, status: 'active', email: 'zed@komuno.test' },
          { isActive: true, status: 'active', email: 'alpha@komuno.test' },
        ],
      })),
      getMemberByCjdRole: vi.fn(async (): Promise<RecruitmentResult> => ({ success: true, data: { email: 'recruit@k.test' } })),
    },
  });
  setCjsModule(emailServicePath, { emailService: { sendEmail: sendEmailSpy } });
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event', html: '<p>event</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test-subject-51', html: '<p>test-51</p>' })),
  });
  setCjsModule(loggerPath, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });
  return { sendEmailSpy };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js iteration51', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('testEmailConfiguration uses first normalized recipient after deduplication', async () => {
    const deps = setupDependencies();
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(true);
    expect(deps.sendEmailSpy).toHaveBeenCalledWith({
      to: ['zed@komuno.test'],
      subject: 'test-subject-51',
      html: '<p>test-51</p>',
    });
  });
});
