import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = { success: boolean; data?: { config?: unknown } & Record<string, unknown> };
type AdminRecord = { isActive: boolean; status: string; email: string };
type AdminsResult = { success: true; data: AdminRecord[] } | { success: false; error: Error };
type RecruitmentResult = { success: true; data: { email?: string | null } | null } | { success: false; error: Error };
type EmailSuccess = { success: true; data: { messageId: string } };

type ServiceResult = { success: boolean; data?: unknown; error?: Error };
type ContextInput = { baseUrl?: string; adminDashboardUrl?: string; branding?: { appName?: string } };
type EmailNotificationServiceLike = {
  notifyNewIdea: (idea: { title: string; proposedBy?: string }) => Promise<ServiceResult>;
  updateContext: (newContext: ContextInput) => void;
};
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

function setupDependencies(): { templateMock: ReturnType<typeof vi.fn>; emailServiceMock: EmailServiceMock } {
  const storageMock: StorageMock = {
    getBrandingConfig: vi.fn(async () => ({
      success: true,
      data: {
        config: JSON.stringify({
          app: { shortName: 'Komuno DB' },
          organization: { fullName: 'CJD Amiens' },
          colors: { primary: '#123456' },
        }),
      },
    })),
    getAllAdmins: vi.fn(async () => ({ success: true, data: [{ isActive: true, status: 'active', email: 'ctx40@example.com' }] })),
    getMemberByCjdRole: vi.fn(async () => ({ success: true, data: null })),
  };

  const emailServiceMock: EmailServiceMock = {
    sendEmail: vi.fn(async () => ({ success: true, data: { messageId: 'msg-wave40' } })),
  };

  const templateMock = vi.fn(() => ({ subject: 'idea-40', html: '<p>idea-40</p>' }));

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: emailServiceMock });
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: templateMock,
    createNewEventEmailTemplate: vi.fn(),
    createNewMemberProposalEmailTemplate: vi.fn(),
    createNewLoanItemEmailTemplate: vi.fn(),
    createTestEmailTemplate: vi.fn(),
  });
  setCjsModule(loggerPath, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { templateMock, emailServiceMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BASE_URL = 'https://komuno.example';
});

describe('email-notification-service wave40 plato', () => {
  it('notifyNewIdea uses updated context merged with branding-loaded values in template call', async () => {
    const { templateMock, emailServiceMock } = setupDependencies();
    const { emailNotificationService } = loadServiceModule();

    await Promise.resolve();
    emailNotificationService.updateContext({ baseUrl: 'https://override.example' });

    const result = await emailNotificationService.notifyNewIdea({ title: 'Idea 40', proposedBy: 'Nina' });

    expect(emailServiceMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, data: { messageId: 'msg-wave40' } });

    const contextArg = templateMock.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(contextArg.baseUrl).toBe('https://override.example');
    const branding = contextArg.branding as Record<string, unknown>;
    expect(branding.appName).toBe('Komuno DB');
    expect(branding.orgFullName).toBe('CJD Amiens');
    expect(branding.primaryColor).toBe('#123456');
  });
});
