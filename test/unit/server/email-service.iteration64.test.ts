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
let nodemailerMockMode: 'cjs' | 'esmodule' = 'cjs';

const makeStorage = (result: EmailConfigResult): IStorage => {
  return {
    getEmailConfig: vi.fn(async () => result),
  } as unknown as IStorage;
};

const primeModuleCache = (): void => {
  const previousNodemailerModule = cjsRequire.cache[nodemailerModulePath];
  const previousBrandingModule = cjsRequire.cache[brandingModulePath];
  const previousLoggerModule = cjsRequire.cache[loggerModulePath];

  const nodemailerExports =
    nodemailerMockMode === 'esmodule'
      ? {
          __esModule: true,
          default: {
            createTransport: createTransportMock,
          },
        }
      : {
          createTransport: createTransportMock,
        };

  cjsRequire.cache[nodemailerModulePath] = {
    ...(previousNodemailerModule ?? {
      id: nodemailerModulePath,
      filename: nodemailerModulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: nodemailerExports,
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

describe('server/email-service.js (iteration 64)', () => {
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
    nodemailerMockMode = 'cjs';

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
    const emailServiceWithConfig = emailService as unknown as { config: { fromEmail?: string; fromName?: string } };
    emailServiceWithConfig.config.fromEmail = '';
    emailServiceWithConfig.config.fromName = '';

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

  it('reloadConfig initialise SMTP depuis les variables d’environnement quand storage est absent', async () => {
    process.env.SMTP_HOST = 'env.smtp.local';
    process.env.SMTP_PORT = '2526';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';
    process.env.SMTP_FROM_NAME = 'Env Sender';
    process.env.SMTP_FROM_EMAIL = 'env.sender@example.com';

    const emailService = loadEmailService();
    await emailService.reloadConfig();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'env.smtp.local',
        port: 2526,
        secure: false,
        auth: {
          user: 'env-user',
          pass: 'env-pass',
        },
      }),
    );
  });

  it('supporte un export nodemailer de type __esModule', async () => {
    nodemailerMockMode = 'esmodule';
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService();
    await emailService.reloadConfig();

    expect(createTransportMock).toHaveBeenCalledTimes(1);
  });

  it('fallback sur env + log warning quand la config DB échoue', async () => {
    process.env.SMTP_HOST = 'fallback.smtp.local';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'true';
    process.env.SMTP_USER = 'fallback-user';
    process.env.SMTP_PASSWORD = 'fallback-pass';

    const emailService = loadEmailService();
    const storage = makeStorage({ success: false, error: new Error('db down') });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[Email] Impossible de charger la configuration SMTP depuis la base',
      expect.objectContaining({ error: 'Error: db down' }),
    );
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'fallback.smtp.local',
        port: 587,
        secure: true,
      }),
    );
  });

  it('normalise les destinataires (trim/lowercase/dedup) avant envoi', async () => {
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService();
    await emailService.reloadConfig();

    await emailService.sendEmail({
      to: ['  USER@Example.COM ', 'user@example.com', 'SECOND@example.com', '   '],
      subject: 'Sujet',
      html: '<p>Body</p>',
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com, second@example.com',
      }),
    );
  });

  it('retourne une erreur métier quand tous les destinataires sont vides après normalisation', async () => {
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService();
    await emailService.reloadConfig();

    const result = await emailService.sendEmail({
      to: ['   ', ''],
      subject: 'Sujet',
      html: '<p>Body</p>',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.message).toBe('Aucun destinataire valide fourni');
    }
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('encapsule et retourne les erreurs SMTP issues de sendMail', async () => {
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService();
    await emailService.reloadConfig();
    sendMailMock.mockRejectedValueOnce('smtp down');

    const result = await emailService.sendEmail({
      to: ['user@example.com'],
      subject: 'Sujet',
      html: '<p>Body</p>',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.message).toBe('Erreur envoi email: smtp down');
    }
    expect(loggerMock.error).toHaveBeenCalledWith(
      '[Email] Erreur lors de l\'envoi SMTP',
      expect.objectContaining({ error: 'smtp down' }),
    );
  });

  it('utilise le port 465 par défaut et secure=true quand SMTP_PORT est invalide', async () => {
    process.env.SMTP_HOST = 'invalid-port.smtp.local';
    process.env.SMTP_PORT = 'not-a-number';
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService();
    await emailService.reloadConfig();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'invalid-port.smtp.local',
        port: 465,
        secure: true,
      }),
    );
  });

  it('priorise secure venant de la DB sur la variable SMTP_SECURE', async () => {
    process.env.SMTP_SECURE = 'false';

    const emailService = loadEmailService();
    const storage = makeStorage({
      success: true,
      data: {
        host: 'db-priority.smtp.local',
        port: 2525,
        secure: true,
        username: 'db-user',
        password: 'db-pass',
      },
    });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'db-priority.smtp.local',
        port: 2525,
        secure: true,
        auth: {
          user: 'db-user',
          pass: 'db-pass',
        },
      }),
    );
  });

  it('utilise SMTP_PORT env valide quand le port DB est invalide', async () => {
    process.env.SMTP_PORT = '2527';

    const emailService = loadEmailService();
    const storage = makeStorage({
      success: true,
      data: {
        host: 'db-invalid-port.smtp.local',
        port: 0,
        username: 'db-user',
        password: 'db-pass',
      },
    });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'db-invalid-port.smtp.local',
        port: 2527,
      }),
    );
  });

  it('respecte SMTP_SECURE=false depuis env même si le port par défaut est 465', async () => {
    process.env.SMTP_HOST = 'env-secure-override.smtp.local';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService();
    await emailService.reloadConfig();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'env-secure-override.smtp.local',
        port: 465,
        secure: false,
      }),
    );
  });

  it('désactive l’envoi quand auth est incomplète et renvoie une erreur métier', async () => {
    process.env.SMTP_HOST = 'incomplete-auth.smtp.local';

    const emailService = loadEmailService();
    const storage = makeStorage({
      success: true,
      data: {
        host: 'db.smtp.local',
        port: 465,
        secure: true,
        username: '',
        password: '',
      },
    });

    emailService.setStorage(storage);
    await emailService.reloadConfig();

    const result = await emailService.sendEmail({
      to: ['user@example.com'],
      subject: 'Sujet',
      html: '<p>Body</p>',
    });

    expect(createTransportMock).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.message).toBe('Service email non configuré');
    }
    expect(loggerMock.warn).toHaveBeenCalledWith(
      "[Email] Configuration SMTP incomplète, envoi d'emails désactivé",
    );
  });

  it('reinitialize recharge la configuration SMTP (alias de reloadConfig)', async () => {
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService() as unknown as EmailServiceLike & {
      reinitialize: () => Promise<void>;
    };

    await emailService.reinitialize();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: {
          user: 'env-user',
          pass: 'env-pass',
        },
      }),
    );
  });

  it('verifyConnection gère une erreur non-Error rejetée par verify', async () => {
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASSWORD = 'env-pass';

    const emailService = loadEmailService();
    await emailService.reloadConfig();
    verifyMock.mockRejectedValueOnce('socket closed');

    const result = await emailService.verifyConnection();

    expect(result).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      '[Email] Erreur de connexion SMTP',
      expect.objectContaining({ error: 'socket closed' }),
    );
  });
});
