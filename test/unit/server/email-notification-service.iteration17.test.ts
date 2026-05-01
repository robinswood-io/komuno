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

type RecruitmentMember = {
  email?: string | null;
};

type RecruitmentResult = {
  success: boolean;
  data: RecruitmentMember | null;
  error?: unknown;
};

type SendEmailInput = {
  to: string[];
  subject: string;
  html: string;
};

type EmailResult =
  | {
      success: true;
      data: { messageId: string };
    }
  | {
      success: false;
      error: unknown;
    };

type MemberProposalInput = {
  firstName: string;
  lastName: string;
  email: string;
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
  getAdminEmails: (options?: { forceRefresh?: boolean }) => Promise<{ success: boolean; data?: string[]; error?: unknown }>;
  sendToRecipients: (
    recipients: string[],
    subject: string,
    html: string,
    context: string,
  ) => Promise<{ success: boolean; data?: unknown; error?: unknown }>;
  notifyNewMemberProposal: (
    memberData: MemberProposalInput,
  ) => Promise<{ success: boolean; data?: unknown; error?: unknown }>;
  testEmailConfiguration: () => Promise<{ success: boolean; data?: unknown; error?: unknown }>;
};

type EmailNotificationServiceModule = {
  emailNotificationService: EmailNotificationServiceLike;
};

type PreparedDeps = {
  storageMock: {
    getBrandingConfig: ReturnType<typeof vi.fn<() => Promise<BrandingConfigResult>>>;
    getAllAdmins: ReturnType<typeof vi.fn<() => Promise<AdminsResult>>>;
    getMemberByCjdRole: ReturnType<typeof vi.fn<(role: string) => Promise<RecruitmentResult>>>;
  };
  emailServiceMock: {
    sendEmail: ReturnType<typeof vi.fn<(input: SendEmailInput) => Promise<EmailResult>>>;
  };
  templatesMock: {
    createNewIdeaEmailTemplate: ReturnType<typeof vi.fn>;
    createNewEventEmailTemplate: ReturnType<typeof vi.fn>;
    createNewMemberProposalEmailTemplate: ReturnType<typeof vi.fn>;
    createNewLoanItemEmailTemplate: ReturnType<typeof vi.fn>;
    createTestEmailTemplate: ReturnType<typeof vi.fn>;
  };
  loggerMock: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
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
  sendEmailResult?: EmailResult;
}): PreparedDeps {
  const storageMock = {
    getBrandingConfig: vi.fn(async (): Promise<BrandingConfigResult> => {
      return (
        options?.brandingResult ?? {
          success: true,
          data: {
            config: {
              colors: { primary: '#0066ff' },
              app: { shortName: 'Komuno' },
              organization: { fullName: 'Komuno Org' },
            },
          },
        }
      );
    }),
    getAllAdmins: vi.fn(async (): Promise<AdminsResult> => {
      return (
        options?.adminsResult ?? {
          success: true,
          data: [
            { isActive: true, status: 'active', email: 'Admin@Komuno.Test ' },
            { isActive: true, status: 'active', email: 'admin@komuno.test' },
            { isActive: true, status: 'inactive', email: 'ignored-inactive-status@test.dev' },
            { isActive: false, status: 'active', email: 'ignored-disabled@test.dev' },
          ],
        }
      );
    }),
    getMemberByCjdRole: vi.fn(async (_role: string): Promise<RecruitmentResult> => {
      return (
        options?.recruitmentResult ?? {
          success: true,
          data: { email: 'recruitment.manager@komuno.test' },
        }
      );
    }),
  };

  const emailServiceMock = {
    sendEmail: vi.fn(async (_input: SendEmailInput): Promise<EmailResult> => {
      return options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-iteration17' } };
    }),
  };

  const templatesMock = {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'new idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'new event', html: '<p>event</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member proposal', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'new loan', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test email', html: '<p>test</p>' })),
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

  return {
    storageMock,
    emailServiceMock,
    templatesMock,
    loggerMock,
  };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js - iteration 17 robust CJS tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('loads branding from stringified config and updates service context', async () => {
    setupDependencies({
      brandingResult: {
        success: true,
        data: {
          config: JSON.stringify({
            colors: { primary: '#ff5500' },
            app: { shortName: 'KOM' },
            organization: { fullName: 'Komuno Club' },
          }),
        },
      },
    });

    const { emailNotificationService } = loadServiceModule();

    await emailNotificationService.loadBranding();

    expect(emailNotificationService.context.baseUrl).toBe('https://komuno.example');
    expect(emailNotificationService.context.adminDashboardUrl).toBe('https://komuno.example/admin');
    expect(emailNotificationService.context.branding).toEqual({
      primaryColor: '#ff5500',
      appName: 'KOM',
      orgFullName: 'Komuno Club',
    });
  });

  it('handles branding loading errors with a warning log (fallback branch)', async () => {
    const deps = setupDependencies({
      brandingResult: {
        success: false,
      },
    });

    deps.storageMock.getBrandingConfig.mockRejectedValueOnce(new Error('db down'));

    const { emailNotificationService } = loadServiceModule();

    await emailNotificationService.loadBranding();

    expect(deps.loggerMock.warn).toHaveBeenCalledWith(
      '[Email Notifications] Impossible de charger le branding depuis la base, fallback par défaut',
      expect.objectContaining({
        error: expect.any(String),
      }),
    );
  });

  it('filters active admins, normalizes/deduplicates emails and uses cache on subsequent call', async () => {
    const deps = setupDependencies();
    const { emailNotificationService } = loadServiceModule();

    const first = await emailNotificationService.getAdminEmails({ forceRefresh: true });
    const second = await emailNotificationService.getAdminEmails();

    expect(first.success).toBe(true);
    expect(first.data).toEqual(['admin@komuno.test']);
    expect(second.success).toBe(true);
    expect(second.data).toEqual(['admin@komuno.test']);
    expect(deps.storageMock.getAllAdmins).toHaveBeenCalledTimes(1);
  });

  it('returns storage failure result when admin query is unsuccessful', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: false,
        data: [],
        error: new Error('admin storage error'),
      },
    });
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.getAdminEmails({ forceRefresh: true });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(deps.storageMock.getAllAdmins).toHaveBeenCalledTimes(1);
  });

  it('sendToRecipients short-circuits when normalized recipients list is empty', async () => {
    const deps = setupDependencies();
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.sendToRecipients(['   ', ''], 'subject', '<p>x</p>', 'empty_case');

    expect(result.success).toBe(true);
    expect(deps.emailServiceMock.sendEmail).not.toHaveBeenCalled();
    expect(deps.loggerMock.warn).toHaveBeenCalledWith(
      '[Email Notifications] Aucun destinataire trouvé, envoi ignoré',
      expect.objectContaining({ context: 'empty_case' }),
    );
  });

  it('sendToRecipients normalizes recipients and propagates sendEmail failure branch', async () => {
    const deps = setupDependencies({
      sendEmailResult: {
        success: false,
        error: new Error('smtp failure'),
      },
    });
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.sendToRecipients(
      ['Admin@Komuno.Test', ' admin@komuno.test ', 'team@komuno.test'],
      'subject',
      '<p>html</p>',
      'failure_case',
    );

    expect(result.success).toBe(false);
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith({
      to: ['admin@komuno.test', 'team@komuno.test'],
      subject: 'subject',
      html: '<p>html</p>',
    });
    expect(deps.loggerMock.error).toHaveBeenCalledWith(
      '[Email Notifications] Échec envoi notification email',
      expect.objectContaining({
        context: 'failure_case',
        recipients: 2,
      }),
    );
  });

  it('notifyNewMemberProposal sends to recruitment manager when available', async () => {
    const deps = setupDependencies({
      recruitmentResult: {
        success: true,
        data: { email: 'manager@komuno.test' },
      },
    });
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewMemberProposal({
      firstName: 'Jean',
      lastName: 'Martin',
      email: 'jean.martin@example.com',
    });

    expect(result.success).toBe(true);
    expect(deps.storageMock.getAllAdmins).not.toHaveBeenCalled();
    expect(deps.templatesMock.createNewMemberProposalEmailTemplate).toHaveBeenCalledTimes(1);
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['manager@komuno.test'],
      }),
    );
  });

  it('notifyNewMemberProposal falls back to admins when recruitment manager email is missing', async () => {
    const deps = setupDependencies({
      recruitmentResult: {
        success: true,
        data: { email: null },
      },
      adminsResult: {
        success: true,
        data: [
          { isActive: true, status: 'active', email: 'admin1@komuno.test' },
          { isActive: true, status: 'active', email: 'admin2@komuno.test' },
        ],
      },
    });
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewMemberProposal({
      firstName: 'Lea',
      lastName: 'Dupuis',
      email: 'lea.dupuis@example.com',
    });

    expect(result.success).toBe(true);
    expect(deps.storageMock.getAllAdmins).toHaveBeenCalledTimes(1);
    expect(deps.loggerMock.warn).toHaveBeenCalledWith(
      '[Email Notifications] Aucun responsable recrutement défini, fallback vers administrateurs',
      expect.objectContaining({ recipients: 2 }),
    );
  });

  it('testEmailConfiguration fails with explicit error when no active admin exists', async () => {
    setupDependencies({
      adminsResult: {
        success: true,
        data: [],
      },
    });
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('Aucun administrateur actif trouvé');
  });

  it('testEmailConfiguration sends test email to first admin recipient', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [
          { isActive: true, status: 'active', email: 'first@komuno.test' },
          { isActive: true, status: 'active', email: 'second@komuno.test' },
        ],
      },
      sendEmailResult: {
        success: true,
        data: { messageId: 'test-msg-id' },
      },
    });
    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(true);
    expect(deps.templatesMock.createTestEmailTemplate).toHaveBeenCalledTimes(1);
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith({
      to: ['first@komuno.test'],
      subject: 'test email',
      html: '<p>test</p>',
    });
  });
});
