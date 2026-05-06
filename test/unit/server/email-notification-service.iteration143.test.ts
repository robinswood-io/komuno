import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type ServiceResult = { success: boolean; data?: unknown; error?: Error };

type EmailNotificationServiceLike = {
  getRecruitmentManagerEmail: () => Promise<{ success: boolean; data?: string | null; error?: Error }>;
  notifyNewMemberProposal: (memberData: { firstName: string; lastName: string; email: string; company?: string }) => Promise<ServiceResult>;
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
    ...(previous ?? { id: path, filename: path, loaded: true, children: [], paths: [] }),
    exports: exportsValue,
  };
}

function loadService(options?: {
  memberByRoleImpl?: () => Promise<unknown>;
  adminsImpl?: () => Promise<unknown>;
}) {
  const loggerMock = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

  setCjsModule(storagePath, {
    storage: {
      getBrandingConfig: vi.fn(async () => ({ success: true, data: { config: {} } })),
      getAllAdmins: vi.fn(
        options?.adminsImpl ??
          (async () => ({
            success: true,
            data: [{ isActive: true, status: 'active', email: 'admin143@example.com' }],
          })),
      ),
      getMemberByCjdRole: vi.fn(options?.memberByRoleImpl ?? (async () => ({ success: true, data: { email: 'rr143@example.com' } }))),
    },
  });

  setCjsModule(emailServicePath, {
    emailService: {
      sendEmail: vi.fn(async () => ({ success: true, data: { messageId: 'msg-143' } })),
    },
  });

  setCjsModule(emailTemplatesPath, {
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member143', html: '<p>member143</p>' })),
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => ({ subject: 'event', html: '<p>event</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan', html: '<p>loan</p>' })),
  });

  setCjsModule(loggerPath, { logger: loggerMock });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  delete cjsRequire.cache[modulePath];
  const loaded = cjsRequire(modulePath) as { emailNotificationService: EmailNotificationServiceLike };
  return { service: loaded.emailNotificationService, loggerMock };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BASE_URL = 'https://komuno.example';
});

describe('server/email-notification-service.js iteration143', () => {
  it('wraps thrown non-Error value in getRecruitmentManagerEmail catch', async () => {
    const { service } = loadService({
      memberByRoleImpl: async () => {
        throw 'role-lookup-143';
      },
    });

    const result = await service.getRecruitmentManagerEmail();

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain('role-lookup-143');
  });

  it('returns no-recipient success payload when recruitment manager missing and admin list empty', async () => {
    const { service, loggerMock } = loadService({
      memberByRoleImpl: async () => ({ success: true, data: null }),
      adminsImpl: async () => ({ success: true, data: [] }),
    });

    const result = await service.notifyNewMemberProposal({
      firstName: 'No',
      lastName: 'Recipient',
      email: 'none143@example.com',
      company: 'Komuno',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ message: 'Aucun destinataire à notifier' });
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[Email Notifications] Aucun destinataire trouvé, envoi ignoré',
      { context: 'new_member_proposal' },
    );
  });
});
