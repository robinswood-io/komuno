import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import type { IStorage } from '../../../server/storage';

type EmailConfigData = {
  host: string;
  port: number;
  secure?: boolean;
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

type ConnectionResult =
  | { success: true; data: true }
  | { success: false; error: Error };

type EmailServiceLike = {
  setStorage(storage: IStorage): void;
  reloadConfig(): Promise<void>;
  testConnection(): Promise<ConnectionResult>;
  verifyConnection(): Promise<boolean>;
  sendEmail(input: {
    to: string[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<{
    success: boolean;
    error?: Error;
    data?: unknown;
  }>;
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

const primeModuleCache = (): void => {
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

describe('server/email-service.js (iteration 40)', () => {
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

  it('verifyConnection retourne false sans transporter', async () => {
    const emailService = loadEmailService();

    const result = await emailService.verifyConnection();

    expect(result).toBe(false);
  });

  it('verifyConnection capture les erreurs SMTP et loggue un message', async () => {
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService();
    const storage = makeStorage({ success: true, data: null });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    verifyMock.mockRejectedValueOnce(new Error('smtp verify failed'));

    const result = await emailService.verifyConnection();

    expect(result).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      '[Email] Erreur de connexion SMTP',
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it('testConnection retourne success=true quand verify passe', async () => {
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService();
    const storage = makeStorage({ success: true, data: null });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    const result = await emailService.testConnection();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(true);
    }
  });

  it('testConnection retourne une erreur quand le transporter est absent', async () => {
    const emailService = loadEmailService();

    const result = await emailService.testConnection();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Transporter non initialisé');
    }
  });

  it('sendEmail utilise les fallbacks fromName/fromEmail et conserve text explicite', async () => {
    const emailService = loadEmailService();
    const storage = makeStorage({
      success: true,
      data: {
        host: 'smtp.db.local',
        port: 465,
        secure: true,
        username: 'db-user@example.com',
        password: 'db-pass',
        fromName: '',
        fromEmail: '',
      },
    });

    emailService.setStorage(storage);
    await emailService.reloadConfig();
    const emailServiceWithConfig = emailService as unknown as { config: { fromEmail?: string } };
    emailServiceWithConfig.config.fromEmail = '';

    await emailService.sendEmail({
      to: ['User@example.com'],
      subject: 'Sujet explicite',
      html: '<p>HTML</p>',
      text: 'Texte explicite',
    });

    expect(getShortAppNameMock).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Komuno" <db-user@example.com>',
        to: 'user@example.com',
        text: 'Texte explicite',
      }),
    );
  });
});
