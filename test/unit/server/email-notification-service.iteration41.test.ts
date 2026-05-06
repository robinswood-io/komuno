import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = {
  success: boolean;
  data?: {
    config?: unknown;
  };
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

type ServiceResult = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

type EmailNotificationServiceLike = {
  notifyNewIdea: (idea: { title: string; proposedBy: string; description?: string }) => Promise<ServiceResult>;
  notifyNewMemberProposal: (memberData: {
    firstName: string;
    lastName: string;
    email: string;
    proposedBy: string;
  }) => Promise<ServiceResult>;
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
  recruitmentResult?: RecruitmentResult;
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
    createNewIdeaEmailTemplate: ReturnType<typeof vi.fn>;
    createNewMemberProposalEmailTemplate: ReturnType<typeof vi.fn>;
  };
} {
  const storageMock = {
    getBrandingConfig: vi.fn(async (): Promise<BrandingConfigResult> => {
      return {
        success: true,
        data: {
          config: {
            colors: { primary: '#0f62fe' },
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
          data: { email: 'recruitment@komuno.test' },
        }
      );
    }),
  };

  const emailServiceMock = {
    sendEmail: vi.fn(async (_input: SendEmailInput): Promise<EmailResult> => {
      return options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-iteration41' } };
    }),
  };

  const templatesMock = {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea-subject', html: '<p>idea-html</p>' })),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member-subject', html: '<p>member-html</p>' })),
  };

  const fullTemplatesModule = {
    ...templatesMock,
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event-subject', html: '<p>event-html</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan-subject', html: '<p>loan-html</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test-subject', html: '<p>test-html</p>' })),
  };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: emailServiceMock });
  setCjsModule(emailTemplatesPath, fullTemplatesModule);
  setCjsModule(loggerPath, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { storageMock, emailServiceMock, templatesMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js - iteration 41 business branch passes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('notifyNewIdea short-circuits to success when no active admin recipient remains after filtering', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [
          { isActive: false, status: 'active', email: 'disabled@komuno.test' },
          { isActive: true, status: 'inactive', email: 'inactive@komuno.test' },
          { isActive: true, status: 'active', email: '    ' },
        ],
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewIdea({
      title: 'No recipient branch',
      proposedBy: 'Lina',
      description: 'branch test',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ message: 'Aucun destinataire à notifier' });
    expect(deps.emailServiceMock.sendEmail).not.toHaveBeenCalled();
  });

  it('notifyNewIdea propagates sendEmail failure from business path', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [
          { isActive: true, status: 'active', email: ' ADMIN@KOMUNO.TEST ' },
          { isActive: true, status: 'active', email: 'admin@komuno.test' },
        ],
      },
      sendEmailResult: {
        success: false,
        error: new Error('smtp down'),
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewIdea({
      title: 'Send failure branch',
      proposedBy: 'Noah',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(deps.templatesMock.createNewIdeaEmailTemplate).toHaveBeenCalledTimes(1);
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith({
      to: ['admin@komuno.test'],
      subject: 'idea-subject',
      html: '<p>idea-html</p>',
    });
  });

  it('notifyNewMemberProposal falls back to admins when recruitment email is empty string', async () => {
    const deps = setupDependencies({
      recruitmentResult: {
        success: true,
        data: { email: '' },
      },
      adminsResult: {
        success: true,
        data: [{ isActive: true, status: 'active', email: 'fallback-admin@komuno.test' }],
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewMemberProposal({
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
      proposedBy: 'Tom',
    });

    expect(result.success).toBe(true);
    expect(deps.templatesMock.createNewMemberProposalEmailTemplate).toHaveBeenCalledTimes(1);
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith({
      to: ['fallback-admin@komuno.test'],
      subject: 'member-subject',
      html: '<p>member-html</p>',
    });
  });
});
