import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = {
  success: boolean;
  data?: {
    config?: unknown;
    colors?: { primary?: string };
    app?: { shortName?: string; name?: string };
    organization?: { fullName?: string; name?: string };
  };
  error?: unknown;
};

type AdminsResult = {
  success: boolean;
  data: Array<{ isActive: boolean; status: string; email: string }>;
  error?: unknown;
};

type RecruitmentResult = {
  success: boolean;
  data: { email?: string | null } | null;
  error?: unknown;
};

type EmailResult =
  | { success: true; data: { messageId: string } }
  | { success: false; error: unknown };

type ServiceResult = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

type EmailNotificationServiceLike = {
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

function setupBaseDependencies(options?: {
  brandingResult?: BrandingConfigResult;
  adminsResult?: AdminsResult;
  recruitmentResult?: RecruitmentResult;
  sendEmailResult?: EmailResult;
  emailTemplatesModule?: unknown;
}): void {
  const storageMock = {
    getBrandingConfig: vi.fn(async (): Promise<BrandingConfigResult> => {
      return (
        options?.brandingResult ?? {
          success: true,
          data: {
            config: {
              colors: { primary: '#2255cc' },
              app: { shortName: 'Komuno' },
              organization: { fullName: 'Komuno Club' },
            },
          },
        }
      );
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
      return (
        options?.recruitmentResult ?? {
          success: true,
          data: { email: 'manager@komuno.test' },
        }
      );
    }),
  };

  const emailServiceMock = {
    sendEmail: vi.fn(async (): Promise<EmailResult> => {
      return options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-iteration40' } };
    }),
  };

  const templatesFallback = {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea-subject', html: '<p>idea-html</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event-subject', html: '<p>event-html</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member-subject', html: '<p>member-html</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan-subject', html: '<p>loan-html</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test-subject', html: '<p>test-html</p>' })),
  };

  const loggerMock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: emailServiceMock });
  setCjsModule(emailTemplatesPath, options?.emailTemplatesModule ?? templatesFallback);
  setCjsModule(loggerPath, { logger: loggerMock });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js - iteration 40 __importStar helper branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('testEmailConfiguration succeeds when email-templates module is __esModule=true', async () => {
    setupBaseDependencies({
      emailTemplatesModule: {
        __esModule: true,
        createTestEmailTemplate: vi.fn(() => ({ subject: 'esm-subject', html: '<p>esm-html</p>' })),
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(true);
  });

  it('testEmailConfiguration keeps working when email-templates module resolves to null-like export', async () => {
    setupBaseDependencies({
      emailTemplatesModule: null,
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(true);
  });

  it('testEmailConfiguration catches failure when module only exposes default export', async () => {
    setupBaseDependencies({
      emailTemplatesModule: {
        default: vi.fn(() => ({ subject: 'default-only', html: '<p>default-only</p>' })),
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('Erreur test email');
  });
});
