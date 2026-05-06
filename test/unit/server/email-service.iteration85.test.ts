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

describe('server/email-service.js (iteration 85)', () => {
  it('reloadConfig sans credentials maintient le service non configuré', async () => {
    const originalEnv = { ...process.env };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_FROM_NAME;
    delete process.env.SMTP_FROM_EMAIL;

    const emailService = loadFreshEmailService();

    await emailService.reloadConfig();

    const result = await emailService.sendEmail({
      to: ['user@example.com'],
      subject: 'Sujet',
      html: '<p>Body</p>',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.message).toBe('Service email non configuré');
    }

    process.env = { ...originalEnv };
  });
});
