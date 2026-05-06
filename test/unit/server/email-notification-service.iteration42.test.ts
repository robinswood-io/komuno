import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = {
  success: boolean;
  data?: {
    config?: unknown;
  };
};

type AdminsResult = {
  success: boolean;
  data: Array<{ isActive: boolean; status: string; email: string }>;
};

type RecruitmentResult = {
  success: boolean;
  data: { email?: string | null } | null;
};

type EmailResult = { success: true; data: { messageId: string } };

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
  notifyNewMemberProposal: (memberData: {
    firstName: string;
    lastName: string;
    email: string;
    proposedBy: string;
  }) => Promise<{ success: boolean; data?: unknown; error?: unknown }>;
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
  recruitmentResult?: RecruitmentResult;
}): {
  storageMock: {
    getBrandingConfig: ReturnType<typeof vi.fn<() => Promise<BrandingConfigResult>>>;
    getAllAdmins: ReturnType<typeof vi.fn<() => Promise<AdminsResult>>>;
    getMemberByCjdRole: ReturnType<typeof vi.fn<(role: string) => Promise<RecruitmentResult>>>;
  };
  loggerMock: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
  emailServiceMock: {
    sendEmail: ReturnType<typeof vi.fn>;
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
      return (
        options?.recruitmentResult ?? {
          success: true,
          data: { email: 'recruitment@komuno.test' },
        }
      );
    }),
  };

  const emailServiceMock = {
    sendEmail: vi.fn(async (): Promise<EmailResult> => {
      return { success: true, data: { messageId: 'msg-iteration42' } };
    }),
  };

  const templatesMock = {
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
  setCjsModule(emailTemplatesPath, templatesMock);
  setCjsModule(loggerPath, { logger: loggerMock });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { storageMock, loggerMock, emailServiceMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js - iteration 42 business fallback branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('loadBranding uses app.name and organization.name fallbacks when short/full names are empty', async () => {
    setupDependencies({
      brandingResult: {
        success: true,
        data: {
          config: JSON.stringify({
            colors: { primary: '#123456' },
            app: { shortName: '', name: 'Komuno Long Name' },
            organization: { fullName: '', name: 'Organisation Fallback' },
          }),
        },
      },
    });

    const { emailNotificationService } = loadServiceModule();
    await emailNotificationService.loadBranding();

    expect(emailNotificationService.context.branding).toEqual({
      primaryColor: '#123456',
      appName: 'Komuno Long Name',
      orgFullName: 'Organisation Fallback',
    });
  });

  it('loadBranding catches JSON parse failures from malformed string config', async () => {
    const deps = setupDependencies({
      brandingResult: {
        success: true,
        data: {
          config: '{ malformed-json',
        },
      },
    });

    const { emailNotificationService } = loadServiceModule();
    await emailNotificationService.loadBranding();

    expect(deps.loggerMock.warn).toHaveBeenCalledWith(
      '[Email Notifications] Impossible de charger le branding depuis la base, fallback par défaut',
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it('notifyNewMemberProposal keeps manager-path and short-circuits when manager email is whitespace-only', async () => {
    const deps = setupDependencies({
      recruitmentResult: {
        success: true,
        data: { email: '   ' },
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewMemberProposal({
      firstName: 'Zoé',
      lastName: 'Durand',
      email: 'zoe@example.com',
      proposedBy: 'Marc',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ message: 'Aucun destinataire à notifier' });
    expect(deps.storageMock.getAllAdmins).not.toHaveBeenCalled();
    expect(deps.emailServiceMock.sendEmail).not.toHaveBeenCalled();
  });
});
