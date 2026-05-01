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
  reinitialize(): Promise<void>;
  testConnection(): Promise<ConnectionResult>;
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

describe('server/email-service.js (iteration 5)', () => {
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

  it('retourne une erreur quand testConnection est appelé sans transporter', async () => {
    const emailService = loadEmailService();

    const result = await emailService.testConnection();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Transporter non initialisé');
    }
  });

  it('retourne une erreur encapsulée quand verify échoue dans testConnection', async () => {
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService();
    const storage = makeStorage({ success: true, data: null });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    verifyMock.mockRejectedValueOnce(new Error('smtp verify failed'));

    const result = await emailService.testConnection();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Test connexion échoué');
      expect(result.error.message).toContain('smtp verify failed');
    }
  });

  it('délègue reinitialize vers reloadConfig', async () => {
    const emailService = loadEmailService();
    const reloadSpy = vi.spyOn(emailService, 'reloadConfig').mockResolvedValue(undefined);

    await emailService.reinitialize();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    reloadSpy.mockRestore();
  });

  it('utilise le port par défaut 465 quand DB et env fournissent des ports invalides', async () => {
    process.env.SMTP_PORT = 'invalid-port';
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService();
    const storage = makeStorage({
      success: true,
      data: {
        host: 'smtp.db.local',
        port: 0,
        secure: undefined,
        username: 'db-user',
        password: 'db-pass',
      },
    });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.db.local',
        port: 465,
        secure: true,
        auth: {
          user: 'db-user',
          pass: 'db-pass',
        },
      }),
    );
  });
});
