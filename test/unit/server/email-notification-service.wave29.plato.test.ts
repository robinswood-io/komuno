import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = { success: boolean; data?: { config?: unknown } & Record<string, unknown> };
type AdminRecord = { isActive: boolean; status: string; email: string };
type AdminsResult = { success: true; data: AdminRecord[] } | { success: false; error: Error };
type RecruitmentResult =
  | { success: true; data: { email?: string | null } | null }
  | { success: false; error: Error };
type EmailSuccess = { success: true; data: { messageId: string } };
type EmailFailure = { success: false; error: Error };
type EmailResult = EmailSuccess | EmailFailure;

type ServiceResult = { success: boolean; data?: unknown; error?: Error };
type EmailNotificationServiceLike = {
  testEmailConfiguration: () => Promise<ServiceResult>;
};
type EmailNotificationServiceModule = { emailNotificationService: EmailNotificationServiceLike };

type StorageMock = {
  getBrandingConfig: ReturnType<typeof vi.fn<() => Promise<BrandingConfigResult>>>;
  getAllAdmins: ReturnType<typeof vi.fn<() => Promise<AdminsResult>>>;
  getMemberByCjdRole: ReturnType<typeof vi.fn<() => Promise<RecruitmentResult>>>;
};

type EmailServiceMock = { sendEmail: ReturnType<typeof vi.fn<() => Promise<EmailResult>>> };

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

function setupDependencies(): { emailServiceMock: EmailServiceMock } {
  const storageMock: StorageMock = {
    getBrandingConfig: vi.fn(async () => ({ success: true, data: {} })),
    getAllAdmins: vi.fn(async () => ({
      success: true,
      data: [
        { isActive: true, status: 'active', email: ' FIRST@EXAMPLE.COM ' },
        { isActive: true, status: 'active', email: 'first@example.com' },
        { isActive: true, status: 'active', email: 'second@example.com' },
      ],
    })),
    getMemberByCjdRole: vi.fn(async () => ({ success: true, data: null })),
  };

  const emailServiceMock: EmailServiceMock = {
    sendEmail: vi.fn(async () => ({ success: true, data: { messageId: 'msg-wave29' } })),
  };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: emailServiceMock });
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event', html: '<p>event</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test-29', html: '<p>test-29</p>' })),
  });
  setCjsModule(loggerPath, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { emailServiceMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BASE_URL = 'https://komuno.example';
});

describe('email-notification-service wave29 plato', () => {
  it('testEmailConfiguration selects first normalized admin recipient for test email', async () => {
    const { emailServiceMock } = setupDependencies();
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.testEmailConfiguration();

    const payload = emailServiceMock.sendEmail.mock.calls[0]?.[0];
    expect(payload).toEqual({ to: ['first@example.com'], subject: 'test-29', html: '<p>test-29</p>' });
    expect(result).toEqual({ success: true, data: { messageId: 'msg-wave29' } });
  });
});
