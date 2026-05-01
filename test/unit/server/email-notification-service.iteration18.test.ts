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
  category: string;
  ownerName: string;
};

type MemberProposalInput = {
  firstName: string;
  lastName: string;
  email: string;
  proposedBy: string;
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
  };
  notifyNewIdea: (idea: IdeaInput) => Promise<ServiceResult>;
  notifyNewEvent: (event: EventInput, organizerName: string) => Promise<ServiceResult>;
  notifyNewLoanItem: (loanItem: LoanItemInput) => Promise<ServiceResult>;
  notifyNewMemberProposal: (memberData: MemberProposalInput) => Promise<ServiceResult>;
  testEmailConfiguration: () => Promise<ServiceResult>;
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
              colors: { primary: '#0f62fe' },
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
      return options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-iteration18' } };
    }),
  };

  const templatesMock = {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea-subject', html: '<p>idea-body</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event-subject', html: '<p>event-body</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member-subject', html: '<p>member-body</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan-subject', html: '<p>loan-body</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test-subject', html: '<p>test-body</p>' })),
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

describe('server/email-notification-service.js - iteration 18 targeted branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('notifyNewIdea returns failure when admin retrieval throws (getAdminEmails catch branch)', async () => {
    const deps = setupDependencies();
    deps.storageMock.getAllAdmins.mockRejectedValueOnce(new Error('admins storage down'));

    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewIdea({
      title: 'Nouvelle idée',
      proposedBy: 'Alice',
      description: 'Description',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('Erreur récupération admins');
    expect(deps.templatesMock.createNewIdeaEmailTemplate).not.toHaveBeenCalled();
    expect(deps.emailServiceMock.sendEmail).not.toHaveBeenCalled();
  });

  it('notifyNewEvent sends notification using event template and organizer name', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [
          { isActive: true, status: 'active', email: ' ADMIN@KOMUNO.TEST ' },
          { isActive: true, status: 'active', email: 'admin@komuno.test' },
        ],
      },
    });

    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewEvent(
      {
        title: 'Afterwork',
        description: 'Networking',
        date: '2026-07-01T18:00:00.000Z',
      },
      'Organisateur Test',
    );

    expect(result.success).toBe(true);
    expect(deps.templatesMock.createNewEventEmailTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Afterwork' }),
      'Organisateur Test',
      expect.objectContaining({
        baseUrl: 'https://komuno.example',
        adminDashboardUrl: 'https://komuno.example/admin',
      }),
    );
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith({
      to: ['admin@komuno.test'],
      subject: 'event-subject',
      html: '<p>event-body</p>',
    });
  });

  it('notifyNewLoanItem handles template crash and returns a formatted failure', async () => {
    const deps = setupDependencies();
    deps.templatesMock.createNewLoanItemEmailTemplate.mockImplementation(() => {
      throw new Error('template failed');
    });

    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewLoanItem({
      title: 'Projecteur',
      category: 'Materiel',
      ownerName: 'Jean',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('Erreur notification matériel');
    expect(deps.loggerMock.error).toHaveBeenCalledWith(
      '[Email Notifications] Erreur notification nouveau matériel',
      expect.objectContaining({ title: 'Projecteur' }),
    );
  });

  it('notifyNewMemberProposal returns recruitment lookup failure without falling back to admins', async () => {
    const deps = setupDependencies({
      recruitmentResult: {
        success: false,
        data: null,
        error: new Error('lookup failed'),
      },
    });

    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.notifyNewMemberProposal({
      firstName: 'Lea',
      lastName: 'Martin',
      email: 'lea@example.com',
      proposedBy: 'Paul',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(deps.storageMock.getAllAdmins).not.toHaveBeenCalled();
    expect(deps.templatesMock.createNewMemberProposalEmailTemplate).not.toHaveBeenCalled();
  });

  it('testEmailConfiguration logs send failure branch when SMTP fails', async () => {
    const deps = setupDependencies({
      sendEmailResult: {
        success: false,
        error: new Error('smtp unavailable'),
      },
      adminsResult: {
        success: true,
        data: [{ isActive: true, status: 'active', email: 'admin@test.dev' }],
      },
    });

    const { emailNotificationService } = loadServiceModule();

    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(false);
    expect(deps.templatesMock.createTestEmailTemplate).toHaveBeenCalledTimes(1);
    expect(deps.loggerMock.error).toHaveBeenCalledWith(
      '[Email Notifications] Échec du test email',
      expect.objectContaining({ recipient: 'admin@test.dev' }),
    );
  });
});
