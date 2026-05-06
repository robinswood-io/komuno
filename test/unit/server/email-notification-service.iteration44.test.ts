import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = {
  success: boolean;
  data?: { config?: unknown };
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
};

type SendEmailInput = {
  to: string[];
  subject: string;
  html: string;
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
  context: {
    baseUrl: string;
    adminDashboardUrl: string;
    branding?: {
      primaryColor?: string;
      appName?: string;
      orgFullName?: string;
    };
  };
  loadBranding: () => Promise<void>;
  notifyNewEvent: (
    event: { title: string; description: string; date: string },
    organizerName: string,
  ) => Promise<ServiceResult>;
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
  brandingResult?: BrandingConfigResult;
  adminsResult?: AdminsResult;
  sendEmailResult?: EmailResult;
}): {
  storageMock: {
    getBrandingConfig: ReturnType<typeof vi.fn<() => Promise<BrandingConfigResult>>>;
    getAllAdmins: ReturnType<typeof vi.fn<() => Promise<AdminsResult>>>;
    getMemberByCjdRole: ReturnType<typeof vi.fn<(role: string) => Promise<RecruitmentResult>>>;
  };
  emailServiceMock: {
    sendEmail: ReturnType<typeof vi.fn<(input: SendEmailInput) => Promise<EmailResult>>>;
  };
  templatesMock: {
    createNewEventEmailTemplate: ReturnType<typeof vi.fn>;
    createTestEmailTemplate: ReturnType<typeof vi.fn>;
  };
  loggerMock: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
} {
  const storageMock = {
    getBrandingConfig: vi.fn(async (): Promise<BrandingConfigResult> => {
      return (
        options?.brandingResult ?? {
          success: true,
          data: {
            config: {
              colors: { primary: '#0055cc' },
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
      return { success: true, data: { email: 'recruitment@komuno.test' } };
    }),
  };

  const emailServiceMock = {
    sendEmail: vi.fn(async (): Promise<EmailResult> => {
      return options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-iteration44' } };
    }),
  };

  const templatesMock = {
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event-subject', html: '<p>event-html</p>' })),
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
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea-subject', html: '<p>idea-html</p>' })),
    createNewEventEmailTemplate: templatesMock.createNewEventEmailTemplate,
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member-subject', html: '<p>member-html</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan-subject', html: '<p>loan-html</p>' })),
    createTestEmailTemplate: templatesMock.createTestEmailTemplate,
  });
  setCjsModule(loggerPath, { logger: loggerMock });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { storageMock, emailServiceMock, templatesMock, loggerMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js - iteration 44 business paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('loadBranding ignores non-success branding payload without raising warning', async () => {
    const deps = setupDependencies({
      brandingResult: {
        success: false,
        data: {
          config: {
            colors: { primary: '#000000' },
            app: { shortName: 'IGNORED' },
            organization: { fullName: 'IGNORED' },
          },
        },
      },
    });

    const { emailNotificationService } = loadServiceModule();
    await emailNotificationService.loadBranding();

    expect(emailNotificationService.context.branding).toBeUndefined();
    expect(deps.loggerMock.warn).not.toHaveBeenCalled();
  });

  it('notifyNewEvent normalizes+deduplicates recipients before send', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [
          { isActive: true, status: 'active', email: ' ADMIN@KOMUNO.TEST ' },
          { isActive: true, status: 'active', email: 'admin@komuno.test' },
          { isActive: true, status: 'active', email: 'team@komuno.test' },
        ],
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewEvent(
      { title: 'Afterwork', description: 'desc', date: '2026-06-01T10:00:00.000Z' },
      'Nina',
    );

    expect(result.success).toBe(true);
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith({
      to: ['admin@komuno.test', 'team@komuno.test'],
      subject: 'event-subject',
      html: '<p>event-html</p>',
    });
  });

  it('testEmailConfiguration returns success in nominal path', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [{ isActive: true, status: 'active', email: 'qa-admin@komuno.test' }],
      },
      sendEmailResult: {
        success: true,
        data: { messageId: 'msg-test-config-44' },
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(true);
    expect(deps.templatesMock.createTestEmailTemplate).toHaveBeenCalledTimes(1);
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith({
      to: ['qa-admin@komuno.test'],
      subject: 'test-subject',
      html: '<p>test-html</p>',
    });
  });
});
