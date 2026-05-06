import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = {
  success: boolean;
  data?: { config?: unknown };
};

type AdminRow = {
  isActive: boolean;
  status: string;
  email: string;
};

type AdminsResult = {
  success: boolean;
  data: AdminRow[];
  error?: unknown;
};

type RecruitmentResult = {
  success: boolean;
  data: { email?: string | null } | null;
};

type EmailResult =
  | { success: true; data: { messageId: string } }
  | { success: false; error: unknown };

type ServiceResult = { success: boolean; data?: unknown; error?: unknown };

type EmailNotificationServiceLike = {
  getAdminEmails: (options?: { forceRefresh?: boolean }) => Promise<ServiceResult>;
  testEmailConfiguration: () => Promise<ServiceResult>;
};

type EmailNotificationServiceModule = {
  emailNotificationService: EmailNotificationServiceLike;
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
    ...(previous ?? {
      id: path,
      filename: path,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: exportsValue,
  };
}

function setupDependencies(options?: {
  adminsResult?: AdminsResult;
  sendEmailResult?: EmailResult;
}): {
  storageMock: {
    getBrandingConfig: ReturnType<typeof vi.fn<() => Promise<BrandingConfigResult>>>;
    getAllAdmins: ReturnType<typeof vi.fn<() => Promise<AdminsResult>>>;
    getMemberByCjdRole: ReturnType<typeof vi.fn<(role: string) => Promise<RecruitmentResult>>>;
  };
} {
  const storageMock = {
    getBrandingConfig: vi.fn(async (): Promise<BrandingConfigResult> => {
      return {
        success: true,
        data: {
          config: {
            colors: { primary: '#0055cc' },
            app: { shortName: 'Komuno' },
            organization: { fullName: 'Komuno Club' },
          },
        },
      };
    }),
    getAllAdmins: vi.fn(async (): Promise<AdminsResult> => {
      return (
        options?.adminsResult ?? {
          success: true,
          data: [{ isActive: true, status: 'active', email: 'admin@komuno.test' }],
        }
      );
    }),
    getMemberByCjdRole: vi.fn(async (): Promise<RecruitmentResult> => {
      return { success: true, data: { email: 'recruitment@komuno.test' } };
    }),
  };

  const emailServiceMock = {
    sendEmail: vi.fn(async (): Promise<EmailResult> => {
      return options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-iteration45' } };
    }),
  };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: emailServiceMock });
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea-subject', html: '<p>idea-html</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event-subject', html: '<p>event-html</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member-subject', html: '<p>member-html</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan-subject', html: '<p>loan-html</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test-subject', html: '<p>test-html</p>' })),
  });
  setCjsModule(loggerPath, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { storageMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js - iteration 45 cache+empty-admin branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('getAdminEmails refreshes once cache TTL has expired', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [{ isActive: true, status: 'active', email: 'admin-ttl@komuno.test' }],
      },
    });

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1_000); // first load
    nowSpy.mockReturnValueOnce(1_500); // second call still in cache
    nowSpy.mockReturnValueOnce(70_500); // third call beyond 60_000 TTL

    const { emailNotificationService } = loadServiceModule();

    const first = await emailNotificationService.getAdminEmails({ forceRefresh: true });
    const second = await emailNotificationService.getAdminEmails();
    const third = await emailNotificationService.getAdminEmails();

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(third.success).toBe(true);
    expect(deps.storageMock.getAllAdmins).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  it('testEmailConfiguration fails when no active admin remains after filtering', async () => {
    setupDependencies({
      adminsResult: {
        success: true,
        data: [
          { isActive: false, status: 'active', email: 'disabled@komuno.test' },
          { isActive: true, status: 'inactive', email: 'inactive@komuno.test' },
          { isActive: true, status: 'active', email: '   ' },
        ],
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('Aucun administrateur actif trouvé pour le test');
  });
});
