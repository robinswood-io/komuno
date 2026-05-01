import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import type { IStorage } from '../../../server/storage';

type EmailConfigData = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName?: string;
  fromEmail?: string;
};

type EmailConfigResult =
  | { success: true; data: EmailConfigData | null }
  | { success: false; error: Error };

type MailOptions = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

type SendMailInfo = {
  messageId: string;
  accepted: Array<string | { toString(): string }>;
  rejected: Array<string | { toString(): string }>;
  response?: string;
};

type TransporterStub = {
  verify: () => Promise<void>;
  sendMail: (options: MailOptions) => Promise<SendMailInfo>;
};

type EmailSendResult =
  | {
      success: true;
      data: {
        messageId: string;
        accepted: string[];
        rejected: string[];
        response?: string;
      };
    }
  | {
      success: false;
      error: Error;
    };

type EmailServiceLike = {
  setStorage(storage: IStorage): void;
  reloadConfig(): Promise<void>;
  sendEmail(input: {
    to: string[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<EmailSendResult>;
};

type EmailServiceJsModule = {
  emailService: EmailServiceLike;
};

const cjsRequire = createRequire(import.meta.url);
const emailServiceModulePath = cjsRequire.resolve('../../../server/email-service.js');
const nodemailerModulePath = cjsRequire.resolve('nodemailer');
const brandingModulePath = cjsRequire.resolve('../../../lib/config/branding-core.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');

const createTransportMock = vi.fn<(config: unknown) => TransporterStub>();
const verifyMock = vi.fn<() => Promise<void>>();
const sendMailMock = vi.fn<(options: MailOptions) => Promise<SendMailInfo>>();
const getShortAppNameMock = vi.fn<() => string>(() => 'Komuno');

const loggerMock = {
  info: vi.fn<(message: string, meta?: unknown) => void>(),
  warn: vi.fn<(message: string, meta?: unknown) => void>(),
  error: vi.fn<(message: string, meta?: unknown) => void>(),
  debug: vi.fn<(message: string, meta?: unknown) => void>(),
};

const originalEnv = { ...process.env };

const makeStorage = (result: EmailConfigResult): IStorage => {
  return {
    getEmailConfig: vi.fn(async () => result),
  } as unknown as IStorage;
};

const primeModuleCache = () => {
  const previousNodemailerModule = cjsRequire.cache[nodemailerModulePath];
  const previousBrandingModule = cjsRequire.cache[brandingModulePath];
  const previousLoggerModule = cjsRequire.cache[loggerModulePath];

  cjsRequire.cache[nodemailerModulePath] = {
    ...(previousNodemailerModule ?? {
      id: nodemailerModulePath,
      filename: nodemailerModulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: {
      createTransport: createTransportMock,
    },
  };

  cjsRequire.cache[brandingModulePath] = {
    ...(previousBrandingModule ?? {
      id: brandingModulePath,
      filename: brandingModulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: {
      getShortAppName: getShortAppNameMock,
    },
  };

  cjsRequire.cache[loggerModulePath] = {
    ...(previousLoggerModule ?? {
      id: loggerModulePath,
      filename: loggerModulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: {
      logger: loggerMock,
    },
  };
};

const loadEmailService = (): EmailServiceLike => {
  primeModuleCache();
  delete cjsRequire.cache[emailServiceModulePath];
  const module = cjsRequire(emailServiceModulePath) as EmailServiceJsModule;
  return module.emailService;
};

describe('server/email-service.js', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_FROM_NAME;
    delete process.env.SMTP_FROM_EMAIL;

    verifyMock.mockReset();
    sendMailMock.mockReset();
    createTransportMock.mockReset();

    verifyMock.mockResolvedValue(undefined);
    sendMailMock.mockResolvedValue({
      messageId: 'smtp-message-id',
      accepted: ['first@example.com'],
      rejected: [],
      response: '250 queued',
    });

    createTransportMock.mockImplementation(() => ({
      verify: verifyMock,
      sendMail: sendMailMock,
    }));

    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
    loggerMock.debug.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    delete cjsRequire.cache[emailServiceModulePath];
    delete cjsRequire.cache[nodemailerModulePath];
    delete cjsRequire.cache[brandingModulePath];
    delete cjsRequire.cache[loggerModulePath];
  });

  it('construit le transport SMTP depuis la configuration DB puis vérifie la connexion', async () => {
    const emailService = loadEmailService();
    const storage = makeStorage({
      success: true,
      data: {
        host: 'smtp.db.local',
        port: 2525,
        secure: false,
        username: 'db-user',
        password: 'db-pass',
        fromName: 'DB Sender',
        fromEmail: 'db-sender@example.com',
      },
    });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.db.local',
        port: 2525,
        secure: false,
        auth: {
          user: 'db-user',
          pass: 'db-pass',
        },
      }),
    );
    expect(verifyMock).toHaveBeenCalled();
  });

  it('fallback sur les variables d’environnement si le chargement DB échoue', async () => {
    process.env.SMTP_HOST = 'smtp.env.local';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';
    process.env.SMTP_FROM_NAME = 'Env Sender';
    process.env.SMTP_FROM_EMAIL = 'env-sender@example.com';

    const emailService = loadEmailService();
    const storage = makeStorage({ success: false, error: new Error('db unavailable') });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[Email] Impossible de charger la configuration SMTP depuis la base',
      expect.objectContaining({ error: 'Error: db unavailable' }),
    );
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.env.local',
        port: 587,
        secure: false,
        auth: {
          user: 'env-user',
          pass: 'env-pass',
        },
      }),
    );
  });

  it('désactive le transport quand les credentials SMTP sont absents', async () => {
    const emailService = loadEmailService();
    const storage = makeStorage({
      success: true,
      data: {
        host: 'smtp.db.local',
        port: 465,
        secure: true,
        username: '',
        password: '',
      },
    });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    expect(createTransportMock).not.toHaveBeenCalled();

    const result = await emailService.sendEmail({
      to: ['user@example.com'],
      subject: 'Hello',
      html: '<p>Hi</p>',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Service email non configuré');
    }
  });

  it('envoie un email avec destinataires normalisés et fallback texte depuis le HTML', async () => {
    const emailService = loadEmailService();
    const storage = makeStorage({
      success: true,
      data: {
        host: 'smtp.db.local',
        port: 465,
        secure: true,
        username: 'db-user',
        password: 'db-pass',
        fromName: 'DB Sender',
        fromEmail: '',
      },
    });

    sendMailMock.mockResolvedValueOnce({
      messageId: 'msg-123',
      accepted: ['ACCEPTED@EXAMPLE.COM', { toString: () => 'accepted2@example.com' }],
      rejected: [{ toString: () => 'rejected@example.com' }],
      response: '250 sent',
    });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    const result = await emailService.sendEmail({
      to: [' FIRST@Example.com ', 'first@example.com', 'second@example.com', '   '],
      subject: 'Sujet',
      html: '<p>Hello&nbsp;<strong>World</strong> &amp; team</p>',
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: '"DB Sender" <noreply@cjd-amiens.fr>',
      to: 'first@example.com, second@example.com',
      subject: 'Sujet',
      html: '<p>Hello&nbsp;<strong>World</strong> &amp; team</p>',
      text: 'Hello World & team',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        messageId: 'msg-123',
        accepted: ['ACCEPTED@EXAMPLE.COM', 'accepted2@example.com'],
        rejected: ['rejected@example.com'],
        response: '250 sent',
      });
    }
  });

  it('retourne une erreur quand la liste des destinataires est vide après normalisation', async () => {
    const emailService = loadEmailService();
    const storage = makeStorage({
      success: true,
      data: {
        host: 'smtp.db.local',
        port: 465,
        secure: true,
        username: 'db-user',
        password: 'db-pass',
      },
    });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    const result = await emailService.sendEmail({
      to: ['  ', '\t', '\n'],
      subject: 'Sujet',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Aucun destinataire valide fourni');
    }
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('retourne une erreur encapsulée quand sendMail échoue', async () => {
    const emailService = loadEmailService();
    const storage = makeStorage({
      success: true,
      data: {
        host: 'smtp.db.local',
        port: 465,
        secure: true,
        username: 'db-user',
        password: 'db-pass',
      },
    });

    sendMailMock.mockRejectedValueOnce(new Error('smtp timeout'));

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    const result = await emailService.sendEmail({
      to: ['user@example.com'],
      subject: 'Sujet',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur envoi email');
      expect(result.error.message).toContain('smtp timeout');
    }
  });
});
