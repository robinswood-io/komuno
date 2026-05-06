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
  notifyNewMemberProposal: (memberData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    motivation?: string;
  }) => Promise<ServiceResult>;
};

type EmailNotificationServiceModule = { emailNotificationService: EmailNotificationServiceLike };

type StorageMock = {
  getBrandingConfig: ReturnType<typeof vi.fn<() => Promise<BrandingConfigResult>>>;
  getAllAdmins: ReturnType<typeof vi.fn<() => Promise<AdminsResult>>>;
  getMemberByCjdRole: ReturnType<typeof vi.fn<() => Promise<RecruitmentResult>>>;
};

type EmailServiceMock = {
  sendEmail: ReturnType<typeof vi.fn<() => Promise<EmailResult>>>;
};

type TemplatesMock = {
  createNewIdeaEmailTemplate: ReturnType<typeof vi.fn>;
  createNewEventEmailTemplate: ReturnType<typeof vi.fn>;
  createNewMemberProposalEmailTemplate: ReturnType<typeof vi.fn>;
  createNewLoanItemEmailTemplate: ReturnType<typeof vi.fn>;
  createTestEmailTemplate: ReturnType<typeof vi.fn>;
};

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

function setupDependencies(): { storageMock: StorageMock; emailServiceMock: EmailServiceMock } {
  const recruitmentError = new Error('recruitment-lookup-failed-wave8');

  const storageMock: StorageMock = {
    getBrandingConfig: vi.fn(async () => ({ success: true, data: { config: {} } })),
    getAllAdmins: vi.fn(async () => ({ success: true, data: [] })),
    getMemberByCjdRole: vi.fn(async () => ({ success: false, error: recruitmentError })),
  };

  const emailServiceMock: EmailServiceMock = {
    sendEmail: vi.fn(async () => ({ success: true, data: { messageId: 'msg-wave8' } })),
  };

  const templatesMock: TemplatesMock = {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event', html: '<p>event</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test', html: '<p>test</p>' })),
  };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: emailServiceMock });
  setCjsModule(emailTemplatesPath, templatesMock);
  setCjsModule(loggerPath, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { storageMock, emailServiceMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BASE_URL = 'https://komuno.example';
});

describe('server/email-notification-service.js wave8 plato', () => {
  it('notifyNewMemberProposal short-circuits when recruitment manager lookup fails', async () => {
    const { storageMock, emailServiceMock } = setupDependencies();
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewMemberProposal({
      firstName: 'Julien',
      lastName: 'Lopez',
      email: 'julien@example.com',
      phone: '0601020304',
      motivation: 'Implication locale',
    });

    expect(storageMock.getMemberByCjdRole).toHaveBeenCalledTimes(1);
    expect(storageMock.getAllAdmins).not.toHaveBeenCalled();
    expect(emailServiceMock.sendEmail).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (result.error instanceof Error) {
      expect(result.error.message).toContain('recruitment-lookup-failed-wave8');
    } else {
      throw new Error('Expected an Error instance in result.error');
    }
  });
});
