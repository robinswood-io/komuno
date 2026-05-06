import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type AdminRecord = { isActive: boolean; status: string; email: string };
type ServiceResult = { success: boolean; data?: unknown; error?: Error };

type ServiceLike = {
  notifyNewEvent: (event: { title: string }, organizerName: string) => Promise<ServiceResult>;
  notifyNewIdea: (idea: { title: string; proposedBy: string }) => Promise<ServiceResult>;
  notifyNewMemberProposal: (memberData: { firstName: string; lastName: string }) => Promise<ServiceResult>;
  getRecruitmentManagerEmail: () => Promise<ServiceResult>;
  getAdminEmails: (options?: { forceRefresh?: boolean }) => Promise<ServiceResult>;
};

type ModuleLike = { emailNotificationService: ServiceLike };

const cjsRequire = createRequire(import.meta.url);
const modulePath = cjsRequire.resolve('../../../server/email-notification-service.js');
const storagePath = cjsRequire.resolve('../../../server/storage.js');
const emailServicePath = cjsRequire.resolve('../../../server/email-service.js');
const templatesPath = cjsRequire.resolve('../../../server/email-templates.js');
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
  admins?: AdminRecord[];
  throwInGetAllAdmins?: boolean;
  throwInGetMemberByRole?: boolean;
  recruitmentEmail?: string | null;
  failGetMemberByRole?: boolean;
  throwInEventTemplate?: boolean;
}) {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const storage = {
    getBrandingConfig: vi.fn(async () => ({ success: true, data: { config: {} } })),
    getAllAdmins: vi.fn(async () => {
      if (options?.throwInGetAllAdmins) {
        throw new Error('admins-crash-147');
      }
      return {
        success: true,
        data:
          options?.admins ??
          [
            { isActive: true, status: 'active', email: 'admin@example.com' },
            { isActive: true, status: 'active', email: 'ADMIN@example.com ' },
          ],
      };
    }),
    getMemberByCjdRole: vi.fn(async () => {
      if (options?.throwInGetMemberByRole) {
        throw new Error('member-role-crash-147');
      }
      if (options?.failGetMemberByRole) {
        return { success: false, error: new Error('member-role-failed-147') };
      }
      const email = Object.prototype.hasOwnProperty.call(options ?? {}, 'recruitmentEmail')
        ? options?.recruitmentEmail
        : 'recruit@example.com';
      return { success: true, data: { email } };
    }),
  };

  const sendEmail = vi.fn(async () => ({ success: true, data: { messageId: 'msg-147' } }));

  const templates = {
    createNewIdeaEmailTemplate: vi.fn(() => ({ subject: 'idea', html: '<p>idea</p>' })),
    createNewEventEmailTemplate: vi.fn(() => {
      if (options?.throwInEventTemplate) {
        throw new Error('event-template-crash-147');
      }
      return { subject: 'event-subject', html: '<p>event-html</p>' };
    }),
    createNewMemberProposalEmailTemplate: vi.fn(() => ({ subject: 'member-subject', html: '<p>member-html</p>' })),
    createNewLoanItemEmailTemplate: vi.fn(() => ({ subject: 'loan', html: '<p>loan</p>' })),
    createTestEmailTemplate: vi.fn(() => ({ subject: 'test-subject', html: '<p>test-html</p>' })),
  };

  setCjsModule(storagePath, { storage });
  setCjsModule(emailServicePath, { emailService: { sendEmail } });
  setCjsModule(templatesPath, templates);
  setCjsModule(loggerPath, { logger });
  setCjsModule(schemaPath, { CJD_ROLES: { RESPONSABLE_RECRUTEMENT: 'RESPONSABLE_RECRUTEMENT' } });

  vi.resetModules();
  delete cjsRequire.cache[modulePath];
  const serviceModule = cjsRequire(modulePath) as ModuleLike;

  return { service: serviceModule.emailNotificationService, logger, storage, templates, sendEmail };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BASE_URL = 'https://komuno.example';
});

describe('server/email-notification-service.js iteration147', () => {
  it('deduplicates admin emails and then serves cached values', async () => {
    const loaded = loadService();

    const first = await loaded.service.getAdminEmails();
    const second = await loaded.service.getAdminEmails();

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(loaded.storage.getAllAdmins).toHaveBeenCalledTimes(1);
    expect(first.data).toEqual(['admin@example.com']);
  });

  it('returns error when getAllAdmins throws', async () => {
    const loaded = loadService({ throwInGetAllAdmins: true });

    const result = await loaded.service.getAdminEmails({ forceRefresh: true });

    expect(result.success).toBe(false);
    expect(loaded.logger.error).toHaveBeenCalledWith(
      '[Email Notifications] Erreur lors de la récupération des administrateurs',
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it('hits notifyNewEvent catch block when event template throws', async () => {
    const loaded = loadService({ throwInEventTemplate: true });

    const result = await loaded.service.notifyNewEvent({ title: 'Event 147' }, 'Organizer 147');

    expect(result.success).toBe(false);
    expect(loaded.logger.error).toHaveBeenCalledWith(
      '[Email Notifications] Erreur notification nouvel événement',
      expect.objectContaining({ title: 'Event 147' }),
    );
  });

  it('falls back to admins when recruitment manager email is null', async () => {
    const loaded = loadService({ recruitmentEmail: null });

    const result = await loaded.service.notifyNewMemberProposal({ firstName: 'Ada', lastName: 'Lovelace' });

    expect(result.success).toBe(true);
    expect(loaded.logger.warn).toHaveBeenCalledWith(
      '[Email Notifications] Aucun responsable recrutement défini, fallback vers administrateurs',
      expect.objectContaining({ recipients: 1 }),
    );
    expect(loaded.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['admin@example.com'], subject: 'member-subject' }),
    );
  });

  it('propagates getRecruitmentManagerEmail failure in notifyNewMemberProposal', async () => {
    const loaded = loadService({ failGetMemberByRole: true });

    const result = await loaded.service.notifyNewMemberProposal({ firstName: 'Grace', lastName: 'Hopper' });

    expect(result.success).toBe(false);
  });

  it('returns error when recruitment manager lookup throws', async () => {
    const loaded = loadService({ throwInGetMemberByRole: true });

    const result = await loaded.service.getRecruitmentManagerEmail();

    expect(result.success).toBe(false);
    expect(loaded.logger.error).toHaveBeenCalledWith(
      '[Email Notifications] Erreur lors de la récupération du responsable recrutement',
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it('returns success with no-recipient message for notifyNewIdea when no active recipients', async () => {
    const loaded = loadService({ admins: [{ isActive: false, status: 'inactive', email: 'x@example.com' }] });

    const result = await loaded.service.notifyNewIdea({ title: 'Idea 147', proposedBy: 'User 147' });

    expect(result.success).toBe(true);
    expect(loaded.sendEmail).not.toHaveBeenCalled();
    expect(loaded.logger.warn).toHaveBeenCalledWith(
      '[Email Notifications] Aucun destinataire trouvé, envoi ignoré',
      expect.objectContaining({ context: 'new_idea' }),
    );
  });
});
