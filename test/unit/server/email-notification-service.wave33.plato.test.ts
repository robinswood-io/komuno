import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = { success: boolean; data?: { config?: unknown } & Record<string, unknown> };
type AdminRecord = { isActive: boolean; status: string; email: string };
type AdminsResult = { success: true; data: AdminRecord[] } | { success: false; error: Error };
type RecruitmentResult = { success: true; data: { email?: string | null } | null } | { success: false; error: Error };
type EmailSuccess = { success: true; data: { messageId: string } };

type ServiceResult = { success: boolean; data?: unknown; error?: Error };
type EmailNotificationServiceLike = { notifyNewLoanItem: (loanItem: { title: string; description?: string }) => Promise<ServiceResult> };
type EmailNotificationServiceModule = { emailNotificationService: EmailNotificationServiceLike };

type StorageMock = {
  getBrandingConfig: ReturnType<typeof vi.fn<() => Promise<BrandingConfigResult>>>;
  getAllAdmins: ReturnType<typeof vi.fn<() => Promise<AdminsResult>>>;
  getMemberByCjdRole: ReturnType<typeof vi.fn<() => Promise<RecruitmentResult>>>;
};

type EmailServiceMock = { sendEmail: ReturnType<typeof vi.fn<() => Promise<EmailSuccess>>> };

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
        { isActive: true, status: 'active', email: ' LoanAdmin@Example.com ' },
        { isActive: true, status: 'active', email: 'loanadmin@example.com' },
      ],
    })),
    getMemberByCjdRole: vi.fn(async () => ({ success: true, data: null })),
  };

  const emailServiceMock: EmailServiceMock = {
    sendEmail: vi.fn(async () => ({ success: true, data: { messageId: 'msg-wave33' } })),
  };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: emailServiceMock });
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: vi.fn(),
    createNewEventEmailTemplate: vi.fn(),
    createNewMemberProposalEmailTemplate: vi.fn(),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan-subject-33', html: '<p>loan-33</p>' })),
    createTestEmailTemplate: vi.fn(),
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

describe('email-notification-service wave33 plato', () => {
  it('notifyNewLoanItem sends to normalized and deduplicated active admin recipients', async () => {
    const { emailServiceMock } = setupDependencies();
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewLoanItem({ title: 'Micro HF', description: 'Matériel audio' });

    const payload = emailServiceMock.sendEmail.mock.calls[0]?.[0];
    expect(payload).toEqual({ to: ['loanadmin@example.com'], subject: 'loan-subject-33', html: '<p>loan-33</p>' });
    expect(result).toEqual({ success: true, data: { messageId: 'msg-wave33' } });
  });
});
