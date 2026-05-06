import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type BrandingConfigResult = {
  success: boolean;
  data?: { config?: unknown };
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
  notifyNewEvent: (
    event: { title: string; description: string; date: string },
    organizerName: string,
  ) => Promise<ServiceResult>;
  notifyNewLoanItem: (loanItem: {
    title: string;
    category?: string;
    ownerName?: string;
    proposedBy?: string;
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
    createNewLoanItemEmailTemplate: ReturnType<typeof vi.fn>;
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
    sendEmail: vi.fn(async (_input: SendEmailInput): Promise<EmailResult> => {
      return options?.sendEmailResult ?? { success: true, data: { messageId: 'msg-iteration43' } };
    }),
  };

  const templatesMock = {
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event-subject', html: '<p>event-html</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan-subject', html: '<p>loan-html</p>' })),
  };

  setCjsModule(storagePath, { storage: storageMock });
  setCjsModule(emailServicePath, { emailService: emailServiceMock });
  setCjsModule(emailTemplatesPath, {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea-subject', html: '<p>idea-html</p>' })),
    createNewEventEmailTemplate: templatesMock.createNewEventEmailTemplate,
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member-subject', html: '<p>member-html</p>' })),
    createNewLoanItemEmailTemplate: templatesMock.createNewLoanItemEmailTemplate,
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test-subject', html: '<p>test-html</p>' })),
  });
  setCjsModule(loggerPath, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  return { storageMock, emailServiceMock, templatesMock };
}

function loadServiceModule(): EmailNotificationServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailNotificationServiceModule;
}

describe('server/email-notification-service.js - iteration 43 business-only paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_URL = 'https://komuno.example';
  });

  it('notifyNewEvent returns success with no send when recipients collapse to empty', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [
          { isActive: false, status: 'active', email: 'disabled@komuno.test' },
          { isActive: true, status: 'inactive', email: 'inactive@komuno.test' },
          { isActive: true, status: 'active', email: ' ' },
        ],
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewEvent(
      { title: 'Event sans destinataire', description: 'desc', date: '2026-06-01T10:00:00.000Z' },
      'Nina',
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ message: 'Aucun destinataire à notifier' });
    expect(deps.templatesMock.createNewEventEmailTemplate).toHaveBeenCalledTimes(1);
    expect(deps.emailServiceMock.sendEmail).not.toHaveBeenCalled();
  });

  it('notifyNewLoanItem propagates sendEmail failure after normalization/deduplication', async () => {
    const deps = setupDependencies({
      adminsResult: {
        success: true,
        data: [
          { isActive: true, status: 'active', email: ' ADMIN@KOMUNO.TEST ' },
          { isActive: true, status: 'active', email: 'admin@komuno.test' },
          { isActive: true, status: 'active', email: 'loan-admin@komuno.test' },
        ],
      },
      sendEmailResult: {
        success: false,
        error: new Error('smtp-failure-iteration43'),
      },
    });

    const { emailNotificationService } = loadServiceModule();
    const result = await emailNotificationService.notifyNewLoanItem({
      title: 'Camera',
      category: 'Matériel',
      ownerName: 'Paul',
      proposedBy: 'Lina',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(deps.emailServiceMock.sendEmail).toHaveBeenCalledWith({
      to: ['admin@komuno.test', 'loan-admin@komuno.test'],
      subject: 'loan-subject',
      html: '<p>loan-html</p>',
    });
  });
});
