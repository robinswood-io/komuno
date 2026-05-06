import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = { success: boolean; data?: { config?: unknown } & Record<string, unknown> };
type AdminRecord = { isActive: boolean; status: string; email: string };
type AdminsResult = { success: true; data: AdminRecord[] } | { success: false; error: Error };
type RecruitmentResult = { success: true; data: { email?: string | null } | null } | { success: false; error: Error };
type EmailSuccess = { success: true; data: { messageId: string } };
type EmailFailure = { success: false; error: Error };
type EmailResult = EmailSuccess | EmailFailure;
type ServiceResult = { success: boolean; data?: unknown; error?: Error };

type EmailNotificationServiceLike = {
  context: {
    baseUrl: string;
    adminDashboardUrl: string;
    branding?: { primaryColor?: string; appName?: string; orgFullName?: string };
  };
  loadBranding: () => Promise<void>;
  getAdminEmails: (options?: { forceRefresh?: boolean }) => Promise<{ success: boolean; data?: string[]; error?: Error }>;
  notifyNewIdea: (idea: { title: string; description?: string; proposedBy?: string; proposedByEmail?: string }) => Promise<ServiceResult>;
  notifyNewEvent: (event: { title: string }, organizerName: string) => Promise<ServiceResult>;
  notifyNewMemberProposal: (memberData: { firstName: string; lastName: string; email: string; company?: string }) => Promise<ServiceResult>;
  notifyNewLoanItem: (loanItem: { title: string; description?: string }) => Promise<ServiceResult>;
  testEmailConfiguration: () => Promise<ServiceResult>;
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

type LoggerMock = {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
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

function setupDependencies(options?: {
  brandingResult?: BrandingConfigResult;
  adminsResult?: AdminsResult;
  recruitmentResult?: RecruitmentResult;
  sendEmailResult?: EmailResult;
  sendEmailThrows?: Error;
}): { storageMock: StorageMock; emailServiceMock: EmailServiceMock; templatesMock: TemplatesMock; loggerMock: LoggerMock } {
  const storageMock: StorageMock = {
    getBrandingConfig: vi.fn(async () => options?.brandingResult ?? { success: true, data: { config: {} } }),
    getAllAdmins: vi.fn(async () =>
      options?.adminsResult ?? {
        success: true,
        data: [{ isActive: true, status: 'active', email: 'admin@example.com' }],
      },
    ),
    getMemberByCjdRole: vi.fn(async () => options?.recruitmentResult ?? { success: true, data: { email: 'recruit@example.com' } }),
  };

  const emailServiceMock: EmailServiceMock = {
    sendEmail: vi.fn(async () => options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-ok' } }),
  };

  if (options?.sendEmailThrows) {
    emailServiceMock.sendEmail = vi.fn(async () => {
      throw options.sendEmailThrows as Error;
    });
  }

  const templatesMock: TemplatesMock = {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event', html: '<p>event</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test', html: '<p>test</p>' })),
  };

  const loggerMock: LoggerMock = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: emailServiceMock });
  setCjsModule(emailTemplatesPath, templatesMock);
  setCjsModule(loggerPath, { logger: loggerMock });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { storageMock, emailServiceMock, templatesMock, loggerMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  vi.resetModules();
  vi.doUnmock('../../../server/email-notification-service.js');
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BASE_URL = 'https://komuno.example';
});

describe('server/email-notification-service.js iteration133', () => {
  it('reuses cached admin emails when options object is empty', async () => {
    const { storageMock } = setupDependencies({
      adminsResult: {
        success: true,
        data: [{ isActive: true, status: 'active', email: ' EmptyOption@Example.com ' }],
      },
    });
    const { emailNotificationService } = loadServiceModule();

    await emailNotificationService.getAdminEmails({ forceRefresh: true });
    const cached = await emailNotificationService.getAdminEmails({});

    expect(cached.success).toBe(true);
    expect(cached.data).toEqual(['emptyoption@example.com']);
    expect(storageMock.getAllAdmins).toHaveBeenCalledTimes(1);
  });
});
