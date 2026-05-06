import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = { success: boolean; data?: { config?: unknown } };
type AdminRecord = { isActive: boolean; status: string; email: string };
type AdminsResult = { success: boolean; data: AdminRecord[] } | { success: false; error: Error };
type RecruitmentResult = { success: boolean; data: { email?: string | null } | null } | { success: false; error: Error };
type EmailSuccess = { success: true; data: { messageId: string } };
type EmailFailure = { success: false; error: Error };
type EmailResult = EmailSuccess | EmailFailure;

type ServiceResult = { success: boolean; data?: unknown; error?: Error };

type EmailNotificationServiceLike = {
  context: { baseUrl: string; adminDashboardUrl: string; branding?: { primaryColor?: string; appName?: string; orgFullName?: string } };
  updateContext: (next: { baseUrl?: string; adminDashboardUrl?: string }) => void;
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
  brandingThrows?: Error;
  adminsResult?: AdminsResult;
  recruitmentResult?: RecruitmentResult;
  sendEmailResult?: EmailResult;
  throwLoanTemplate?: boolean;
}): { storageMock: StorageMock; emailServiceMock: EmailServiceMock } {
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

  if (options?.brandingThrows) {
    storageMock.getBrandingConfig = vi.fn(async () => {
      throw options.brandingThrows;
    });
  }

  const emailServiceMock: EmailServiceMock = {
    sendEmail: vi.fn(async () => options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-ok' } }),
  };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: emailServiceMock });
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event', html: '<p>event</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: options?.throwLoanTemplate
      ? vi.fn(() => {
          throw new Error('loan-template-failure');
        })
      : vi.fn(() => ({ subject: 'loan', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test', html: '<p>test</p>' })),
  });
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

describe('server/email-notification-service.js iteration86', () => {
  it('sends member proposal email to recruitment manager when available', async () => {
    const { emailServiceMock } = setupDependencies({
      recruitmentResult: { success: true, data: { email: 'recruit.manager@example.com' } },
    });
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewMemberProposal({
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
    });

    expect(result.success).toBe(true);
    expect(emailServiceMock.sendEmail).toHaveBeenCalledTimes(1);
    const payload = emailServiceMock.sendEmail.mock.calls[0][0] as { to: string[] };
    expect(payload.to).toEqual(['recruit.manager@example.com']);
  });
});
