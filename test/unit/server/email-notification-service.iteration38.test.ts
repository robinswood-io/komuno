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
  | { success: true; data: { messageId: string } }
  | { success: false; error: unknown };

type IdeaInput = {
  title: string;
  proposedBy: string;
  description?: string;
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
  notifyNewIdea: (idea: IdeaInput) => Promise<ServiceResult>;
  notifyNewMemberProposal: (memberData: MemberProposalInput) => Promise<ServiceResult>;
  getRecruitmentManagerEmail: () => Promise<ServiceResult>;
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
              colors: { primary: '#1456f0' },
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
      return options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-iteration38' } };
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

describe('server/email-notification-service.js - iteration 38 targeted uncovered branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('notifyNewIdea hits catch branch when idea template creation throws', async () => {
    const deps = setupDependencies();
    deps.templatesMock.createNewIdeaEmailTemplate.mockImplementation(() => {
      throw new Error('idea template exploded');
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewIdea({
      title: 'Idée crash template',
      proposedBy: 'Lina',
      description: 'test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('Erreur notification idée');
    expect(deps.loggerMock.error).toHaveBeenCalledWith(
      '[Email Notifications] Erreur notification nouvelle idée',
      expect.objectContaining({ title: 'Idée crash template' }),
    );
  });

  it('notifyNewMemberProposal hits catch branch when member template creation throws', async () => {
    const deps = setupDependencies({
      recruitmentResult: { success: true, data: { email: 'recruiter@komuno.test' } },
    });
    deps.templatesMock.createNewMemberProposalEmailTemplate.mockImplementation(() => {
      throw new Error('member template exploded');
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewMemberProposal({
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
      proposedBy: 'Nina',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('Erreur notification proposition membre');
    expect(deps.emailServiceMock.sendEmail).not.toHaveBeenCalled();
  });

  it('testEmailConfiguration returns admin retrieval failure result directly', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: false,
        data: [],
        error: new Error('forced admin lookup failure'),
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String(result.error)).toContain('forced admin lookup failure');
    expect(deps.templatesMock.createTestEmailTemplate).not.toHaveBeenCalled();
    expect(deps.emailServiceMock.sendEmail).not.toHaveBeenCalled();
  });

  it('getRecruitmentManagerEmail uses fallback Unknown error when storage failure has no explicit error field', async () => {
    setupDependencies({
      recruitmentResult: {
        success: false,
        data: null,
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.getRecruitmentManagerEmail();

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('Unknown error');
  });
});
