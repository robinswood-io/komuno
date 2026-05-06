import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = { success: boolean; data?: { config?: unknown } & Record<string, unknown> };
type AdminRecord = { isActive: boolean; status: string; email: string };
type AdminsResult = { success: true; data: AdminRecord[] } | { success: false; error: Error };
type RecruitmentResult =
  | { success: true; data: { email?: string | null } | null }
  | { success: false; error: Error };

type ServiceResult = { success: boolean; data?: unknown; error?: Error };
type EmailNotificationServiceLike = {
  getRecruitmentManagerEmail: () => Promise<ServiceResult>;
};
type EmailNotificationServiceModule = { emailNotificationService: EmailNotificationServiceLike };

type StorageMock = {
  getBrandingConfig: ReturnType<typeof vi.fn<() => Promise<BrandingConfigResult>>>;
  getAllAdmins: ReturnType<typeof vi.fn<() => Promise<AdminsResult>>>;
  getMemberByCjdRole: ReturnType<typeof vi.fn<() => Promise<RecruitmentResult>>>;
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

function setupDependencies(): { storageMock: StorageMock } {
  const storageMock: StorageMock = {
    getBrandingConfig: vi.fn(async () => ({ success: true, data: {} })),
    getAllAdmins: vi.fn(async () => ({ success: true, data: [] })),
    getMemberByCjdRole: vi.fn(async () => ({
      success: true,
      data: { email: ' Manager@Example.com ' },
    })),
  };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: { sendEmail: vi.fn(async () => ({ success: true, data: { messageId: 'x' } })) } });
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event', html: '<p>event</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test', html: '<p>test</p>' })),
  });
  setCjsModule(loggerPath, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { storageMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BASE_URL = 'https://komuno.example';
});

describe('email-notification-service wave25 plato', () => {
  it('getRecruitmentManagerEmail returns the role email value as-is when present', async () => {
    const { storageMock } = setupDependencies();
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.getRecruitmentManagerEmail();

    expect(storageMock.getMemberByCjdRole).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, data: ' Manager@Example.com ' });
  });
});
