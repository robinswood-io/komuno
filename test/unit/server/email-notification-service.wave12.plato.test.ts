import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SendEmailResult = { success: boolean; data?: unknown; error?: Error };

type EmailServiceLike = {
  sendEmail: (emailData: { to: string[]; subject: string; html: string; text?: string }) => Promise<SendEmailResult>;
};

type EmailServiceInternals = EmailServiceLike & {
  transporter: { sendMail: (input: Record<string, unknown>) => Promise<unknown>; verify: () => Promise<void> } | null;
  config:
    | {
        host: string;
        port: number;
        secure: boolean;
        auth: { user: string; pass: string };
        fromName: string;
        fromEmail: string;
      }
    | null;
};

type EmailServiceModule = { emailService: EmailServiceLike };

const cjsRequire = createRequire(import.meta.url);
const modulePath = cjsRequire.resolve('../../../server/email-service.js');

function loadServiceModule(): EmailServiceModule {
  delete cjsRequire.cache[modulePath];
  return cjsRequire(modulePath) as EmailServiceModule;
}

beforeEach(() => {
  process.env.SMTP_USER = '';
  process.env.SMTP_PASSWORD = '';
});

describe('server/email-service.js wave12 plato', () => {
  it('sendEmail returns an explicit configuration error when transporter is not initialized', async () => {
    const { emailService } = loadServiceModule();
    const service = emailService as EmailServiceInternals;

    service.transporter = null;
    service.config = null;

    const result = await service.sendEmail({
      to: ['admin@example.com'],
      subject: 'Wave 12',
      html: '<p>Email de test</p>',
    });

    expect(result.success).toBe(false);
    if (result.error instanceof Error) {
      expect(result.error.message).toBe('Service email non configuré');
    } else {
      throw new Error('Expected an Error instance in result.error');
    }
  });
});
