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

type EventInput = {
  title: string;
  description: string;
  date: string;
};

type LoanItemInput = {
  title: string;
  category?: string;
  ownerName?: string;
};

type MemberProposalInput = {
  firstName: string;
  lastName: string;
  email: string;
};

type ServiceResult = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

type EmailNotificationServiceLike = {
  getAdminEmails: (options?: { forceRefresh?: boolean }) => Promise<{ success: boolean; data?: string[]; error?: unknown }>;
  getRecruitmentManagerEmail: () => Promise<{ success: boolean; data?: string | null; error?: unknown }>;
  notifyNewEvent: (event: EventInput, organizerName: string) => Promise<ServiceResult>;
  notifyNewLoanItem: (loanItem: LoanItemInput) => Promise<ServiceResult>;
  notifyNewMemberProposal: (memberData: MemberProposalInput) => Promise<ServiceResult>;
  testEmailConfiguration: () => Promise<ServiceResult>;
  updateContext: (newContext: { baseUrl?: string; adminDashboardUrl?: string }) => void;
  context: {
    baseUrl: string;
    adminDashboardUrl: string;
  };
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
  adminsResult?: AdminsResult;
  recruitmentResult?: RecruitmentResult;
  sendEmailResult?: EmailResult;
}): PreparedDeps {
  const storageMock = {
    getBrandingConfig: vi.fn(async (): Promise<BrandingConfigResult> => {
      return {
        success: true,
        data: {
          config: {
            colors: { primary: '#0245A3' },
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
      return options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-iter1' } };
    }),
  };

  const templatesMock = {
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event-subject', html: '<p>event</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member-subject', html: '<p>member</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan-subject', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test-subject', html: '<p>test</p>' })),
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
    createNewEventEmailTemplate: templatesMock.createNewEventEmailTemplate,
    createNewMemberProposalEmailTemplate: templatesMock.createNewMemberProposalEmailTemplate,
    createNewLoanItemEmailTemplate: templatesMock.createNewLoanItemEmailTemplate,
    createTestEmailTemplate: templatesMock.createTestEmailTemplate,
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea-subject', html: '<p>idea</p>' })),
  });
  setCjsModule(loggerPath, { logger: loggerMock });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { storageMock, emailServiceMock, templatesMock, loggerMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js - iteration1 targeted coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('getAdminEmails returns Unknown error when storage reports failure without explicit error', async () => {
    setupDependencies({
      adminsResult: {
        success: false,
        data: [],
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.getAdminEmails({ forceRefresh: true });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Unknown error');
  });

  it('getAdminEmails bypasses cache when forceRefresh is true', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [{ isActive: true, status: 'active', email: 'cache@komuno.test' }],
      },
    });

    const { emailNotificationService } = loadServiceModule();

    const first = await emailNotificationService.getAdminEmails({ forceRefresh: true });
    const second = await emailNotificationService.getAdminEmails({ forceRefresh: true });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(deps.storageMock.getAllAdmins).toHaveBeenCalledTimes(2);
  });

  it('getRecruitmentManagerEmail returns success with null email when role member is missing', async () => {
    setupDependencies({
      recruitmentResult: {
        success: true,
        data: null,
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.getRecruitmentManagerEmail();

    expect(result).toEqual({ success: true, data: null });
  });

  it('getRecruitmentManagerEmail wraps thrown storage exceptions', async () => {
    const deps = setupDependencies();
    deps.storageMock.getMemberByCjdRole.mockRejectedValueOnce(new Error('storage exploded'));

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.getRecruitmentManagerEmail();

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain('Erreur récupération responsable recrutement');
  });

  it('notifyNewEvent returns admin retrieval failure and skips template/send', async () => {
    const deps = setupDependencies();
    deps.storageMock.getAllAdmins.mockRejectedValueOnce(new Error('admins unavailable'));

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewEvent(
      {
        title: 'Networking Event',
        description: 'Monthly event',
        date: '2026-09-10T18:00:00.000Z',
      },
      'Organisateur',
    );

    expect(result.success).toBe(false);
    expect(deps.templatesMock.createNewEventEmailTemplate).not.toHaveBeenCalled();
    expect(deps.emailServiceMock.sendEmail).not.toHaveBeenCalled();
  });

  it('notifyNewLoanItem succeeds with normalized recipients and loan template', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [
          { isActive: true, status: 'active', email: ' ADMIN@KOMUNO.TEST ' },
          { isActive: true, status: 'active', email: 'admin@komuno.test' },
          { isActive: true, status: 'active', email: 'loan-admin@komuno.test' },
        ],
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewLoanItem({
      title: 'Caméra 4K',
      category: 'Matériel',
      ownerName: 'Pat',
    });

    expect(result.success).toBe(true);
    expect(deps.templatesMock.createNewLoanItemEmailTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Caméra 4K' }),
      expect.objectContaining({ adminDashboardUrl: 'https://komuno.example/admin' }),
    );
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith({
      to: ['admin@komuno.test', 'loan-admin@komuno.test'],
      subject: 'loan-subject',
      html: '<p>loan</p>',
    });
  });

  it('testEmailConfiguration returns sendEmail failure result branch', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [{ isActive: true, status: 'active', email: 'first@komuno.test' }],
      },
      sendEmailResult: {
        success: false,
        error: new Error('smtp refused'),
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.testEmailConfiguration();

    expect(result.success).toBe(false);
    expect(deps.templatesMock.createTestEmailTemplate).toHaveBeenCalledTimes(1);
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith({
      to: ['first@komuno.test'],
      subject: 'test-subject',
      html: '<p>test</p>',
    });
    expect(deps.loggerMock.error).toHaveBeenCalledWith(
      '[Email Notifications] Échec du test email',
      expect.objectContaining({ recipient: 'first@komuno.test' }),
    );
  });

  it('notifyNewMemberProposal returns admin retrieval failure during fallback path', async () => {
    const deps = setupDependencies({
      recruitmentResult: {
        success: true,
        data: { email: null },
      },
    });
    deps.storageMock.getAllAdmins.mockRejectedValueOnce(new Error('fallback admin list failed'));

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewMemberProposal({
      firstName: 'Lina',
      lastName: 'Moreau',
      email: 'lina@example.com',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(deps.templatesMock.createNewMemberProposalEmailTemplate).not.toHaveBeenCalled();
    expect(deps.emailServiceMock.sendEmail).not.toHaveBeenCalled();
  });
});
