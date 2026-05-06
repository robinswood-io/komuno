import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = { success: boolean; data?: { config?: unknown } };
type AdminsResult = {
  success: boolean;
  data: Array<{ isActive: boolean; status: string; email: string }>;
  error?: unknown;
};
type RecruitmentResult = { success: boolean; data: { email?: string | null } | null };
type EmailResult = { success: true; data: { messageId: string } };
type ServiceResult = { success: boolean; data?: unknown; error?: unknown };
type EmailNotificationServiceLike = {
  notifyNewLoanItem: (loanItem: { title: string; category?: string; ownerName?: string }) => Promise<ServiceResult>;
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

function setupDependencies(adminsResult: AdminsResult): void {
  setCjsModule(storagePath, {
    storage: {
      getBrandingConfig: vi.fn(async (): Promise<BrandingConfigResult> => ({ success: true, data: { config: {} } })),
      getAllAdmins: vi.fn(async (): Promise<AdminsResult> => adminsResult),
      getMemberByCjdRole: vi.fn(async (): Promise<RecruitmentResult> => ({ success: true, data: { email: 'recruitment@komuno.test' } })),
    },
  });
  setCjsModule(emailServicePath, {
    emailService: { sendEmail: vi.fn(async (): Promise<EmailResult> => ({ success: true, data: { messageId: 'msg-47' } })) },
  });
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event', html: '<p>event</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => {
      throw new Error('loan template crash 47');
    }),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test', html: '<p>test</p>' })),
  });
  setCjsModule(loggerPath, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js iteration47', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('notifyNewLoanItem keeps admin-failure short-circuit before template call', async () => {
    setupDependencies({ success: false, data: [], error: new Error('admins-failed-47') });
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewLoanItem({ title: 'Camera 47', category: 'Matériel' });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('admins-failed-47');
  });
});
