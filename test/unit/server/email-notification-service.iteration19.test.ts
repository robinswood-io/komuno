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

type IdeaInput = {
  title: string;
  proposedBy: string;
  proposedByEmail?: string;
  description?: string;
  status?: string;
};

type EventInput = {
  title: string;
  description: string;
  date: string;
};

type LoanItemInput = {
  title: string;
  lenderName?: string;
  proposedBy?: string;
  proposedByEmail?: string;
};

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
  notifyNewIdea: (idea: IdeaInput) => Promise<ServiceResult>;
  notifyNewEvent: (event: EventInput, organizerName: string) => Promise<ServiceResult>;
  notifyNewLoanItem: (loanItem: LoanItemInput) => Promise<ServiceResult>;
  testEmailConfiguration: () => Promise<ServiceResult>;
  updateContext: (newContext: { baseUrl?: string; adminDashboardUrl?: string }) => void;
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
    getMemberByCjdRole: vi.fn(async (_role: string): Promise<RecruitmentResult> => {
      return (
        options?.recruitmentResult ?? {
          success: true,
          data: { email: 'manager@komuno.test' },
        }
      );
    }),
  };

  const emailServiceMock = {
    sendEmail: vi.fn(async (_input: SendEmailInput): Promise<EmailResult> => {
      return options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-iteration19' } };
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

  return { storageMock, emailServiceMock, templatesMock, loggerMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js - iteration 19 extra coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('notifyNewIdea sends to normalized active admins and uses idea template payload', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [
          { isActive: true, status: 'active', email: ' ADMIN@KOMUNO.TEST ' },
          { isActive: true, status: 'active', email: 'admin@komuno.test' },
          { isActive: true, status: 'inactive', email: 'ignored@komuno.test' },
        ],
      },
    });

    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewIdea({
      title: 'Idée coverage',
      proposedBy: 'Camille',
      proposedByEmail: 'camille@example.com',
      description: 'Description idée',
      status: 'pending',
    });

    expect(result.success).toBe(true);
    expect(deps.templatesMock.createNewIdeaEmailTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Idée coverage' }),
      'Camille',
      expect.objectContaining({ adminDashboardUrl: 'https://komuno.example/admin' }),
    );
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith({
      to: ['admin@komuno.test'],
      subject: 'idea-subject',
      html: '<p>idea-html</p>',
    });
  });

  it('notifyNewEvent returns formatted failure when template throws', async () => {
    const deps = setupDependencies();
    deps.templatesMock.createNewEventEmailTemplate.mockImplementation(() => {
      throw new Error('event template crash');
    });

    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewEvent(
      {
        title: 'Event en erreur',
        description: 'desc',
        date: '2026-08-01T10:00:00.000Z',
      },
      'Nina',
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('Erreur notification événement');
    expect(deps.loggerMock.error).toHaveBeenCalledWith(
      '[Email Notifications] Erreur notification nouvel événement',
      expect.objectContaining({ title: 'Event en erreur' }),
    );
  });

  it('notifyNewLoanItem short-circuits when admin lookup reports failure', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: false,
        data: [],
        error: new Error('admin lookup fail'),
      },
    });

    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewLoanItem({
      title: 'Caméra',
      lenderName: 'Paul',
      proposedBy: 'Lina',
      proposedByEmail: 'lina@example.com',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(deps.templatesMock.createNewLoanItemEmailTemplate).not.toHaveBeenCalled();
    expect(deps.emailServiceMock.sendEmail).not.toHaveBeenCalled();
  });

  it('testEmailConfiguration catches unexpected template error and returns service error', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [{ isActive: true, status: 'active', email: 'admin@komuno.test' }],
      },
    });
    deps.templatesMock.createTestEmailTemplate.mockImplementation(() => {
      throw new Error('template rendering failed');
    });

    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('Erreur test email');
    expect(deps.emailServiceMock.sendEmail).not.toHaveBeenCalled();
  });

  it('updateContext merges partial fields and keeps existing dashboard URL', async () => {
    setupDependencies();
    const { emailNotificationService } = loadServiceModule();

    expect(emailNotificationService.context.baseUrl).toBe('https://komuno.example');
    expect(emailNotificationService.context.adminDashboardUrl).toBe('https://komuno.example/admin');

    emailNotificationService.updateContext({ baseUrl: 'https://new.example.test' });

    expect(emailNotificationService.context.baseUrl).toBe('https://new.example.test');
    expect(emailNotificationService.context.adminDashboardUrl).toBe('https://komuno.example/admin');
  });
});
