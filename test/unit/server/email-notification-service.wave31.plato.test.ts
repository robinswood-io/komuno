import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = { success: boolean; data?: { config?: unknown } & Record<string, unknown> };
type AdminRecord = { isActive: boolean; status: string; email: string };
type AdminsResult = { success: true; data: AdminRecord[] } | { success: false; error: Error };
type RecruitmentResult = { success: true; data: { email?: string | null } | null } | { success: false; error: Error };

type ServiceResult = { success: boolean; data?: unknown; error?: Error };
type EmailNotificationServiceLike = { getAdminEmails: (options?: { forceRefresh?: boolean }) => Promise<ServiceResult> };
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
  let callIndex = 0;
  const storageMock: StorageMock = {
    getBrandingConfig: vi.fn(async () => ({ success: true, data: {} })),
    getAllAdmins: vi.fn(async () => {
      callIndex += 1;
      if (callIndex === 1) {
        return { success: true, data: [{ isActive: true, status: 'active', email: 'first@example.com' }] };
      }
      return { success: true, data: [{ isActive: true, status: 'active', email: 'second@example.com' }] };
    }),
    getMemberByCjdRole: vi.fn(async () => ({ success: true, data: null })),
  };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: { sendEmail: vi.fn() } });
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: vi.fn(),
    createNewEventEmailTemplate: vi.fn(),
    createNewMemberProposalEmailTemplate: vi.fn(),
    createNewLoanItemEmailTemplate: vi.fn(),
    createTestEmailTemplate: vi.fn(),
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

describe('email-notification-service wave31 plato', () => {
  it('getAdminEmails forceRefresh bypasses cache and reloads recipients', async () => {
    const { storageMock } = setupDependencies();
    const { emailNotificationService } = loadServiceModule();

    const first = await emailNotificationService.getAdminEmails({ forceRefresh: true });
    const second = await emailNotificationService.getAdminEmails({ forceRefresh: true });

    expect(storageMock.getAllAdmins).toHaveBeenCalledTimes(2);
    expect(first).toEqual({ success: true, data: ['first@example.com'] });
    expect(second).toEqual({ success: true, data: ['second@example.com'] });
  });
});
