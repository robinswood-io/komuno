import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type EmailResult = {
  success: boolean;
  error?: Error;
  data?: unknown;
};

type ConnectionResult =
  | { success: true; data: true }
  | { success: false; error: Error };

type EmailServiceLike = {
  reloadConfig(): Promise<void>;
  reinitialize?(): Promise<void>;
  verifyConnection(): Promise<boolean>;
  testConnection(): Promise<ConnectionResult>;
  sendEmail(input: {
    to: string[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<EmailResult>;
};

const cjsRequire = createRequire(import.meta.url);
const emailServiceModulePath = cjsRequire.resolve('../../../server/email-service.js');

const loadFreshEmailService = (): EmailServiceLike => {
  delete cjsRequire.cache[emailServiceModulePath];
  const mod = cjsRequire(emailServiceModulePath) as { emailService: EmailServiceLike };
  return mod.emailService;
};

describe('server/email-service.js (iteration 89)', () => {
  it('verifyConnection reste stable sur appels successifs sans config', async () => {
    const originalEnv = { ...process.env };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_FROM_NAME;
    delete process.env.SMTP_FROM_EMAIL;

    const emailService = loadFreshEmailService();

    const first = await emailService.verifyConnection();
    const second = await emailService.verifyConnection();

    expect(first).toBe(false);
    expect(second).toBe(false);

    process.env = { ...originalEnv };
  });
});
