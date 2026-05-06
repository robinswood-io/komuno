import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = { success: boolean; data?: { config?: unknown } };
type AdminRecord = { isActive: boolean; status: string; email: unknown };
type AdminsResult = { success: boolean; data: AdminRecord[] } | { success: false; error: Error };
type RecruitmentResult = { success: boolean; data: { email?: string | null } | null } | { success: false; error: Error };
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
  updateContext: (next: Record<string, unknown>) => void;
  getAdminEmails: (options?: { forceRefresh?: boolean }) => Promise<{ success: boolean; data?: string[]; error?: Error }>;
  getRecruitmentManagerEmail: () => Promise<{ success: boolean; data?: string | null; error?: Error }>;
  notifyNewIdea: (idea: { title: string; description?: string; proposedBy?: string; proposedByEmail?: string }) => Promise<ServiceResult>;
  notifyNewEvent: (event: { title: string }, organizerName: string) => Promise<ServiceResult>;
  notifyNewMemberProposal: (memberData: { firstName: string; lastName: string; email: string; company?: string }) => Promise<ServiceResult>;
  notifyNewLoanItem: (loanItem: { title: string; description?: string; category?: string }) => Promise<ServiceResult>;
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
  throwIdeaTemplate?: boolean;
  throwMemberTemplate?: boolean;
  throwLoanTemplate?: boolean;
}): { storageMock: StorageMock; emailServiceMock: EmailServiceMock; templatesMock: TemplatesMock } {
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

  const templatesMock: TemplatesMock = {
    createNewIdeaEmailTemplate: options?.throwIdeaTemplate
      ? vi.fn(() => {
          throw new Error('idea-template-failure');
        })
      : vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event', html: '<p>event</p>' })),
    createNewMemberProposalEmailTemplate: options?.throwMemberTemplate
      ? vi.fn(() => {
          throw new Error('member-template-failure');
        })
      : vi.fn(() => ({ subject: 'member', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: options?.throwLoanTemplate
      ? vi.fn(() => {
          throw new Error('loan-template-failure');
        })
      : vi.fn(() => ({ subject: 'loan', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test', html: '<p>test</p>' })),
  };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: emailServiceMock });
  setCjsModule(emailTemplatesPath, templatesMock);
  setCjsModule(loggerPath, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { storageMock, emailServiceMock, templatesMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BASE_URL = 'https://komuno.example';
});

describe('server/email-notification-service.js iteration118', () => {
  it('returns failure in notifyNewIdea when malformed admin email crashes admin normalization', async () => {
    const { templatesMock, emailServiceMock } = setupDependencies({
      adminsResult: {
        success: true,
        data: [{ isActive: true, status: 'active', email: undefined }],
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewIdea({ title: 'Idea 118' });

    expect(result.success).toBe(false);
    expect(templatesMock.createNewIdeaEmailTemplate).not.toHaveBeenCalled();
    expect(emailServiceMock.sendEmail).not.toHaveBeenCalled();
  });
});
