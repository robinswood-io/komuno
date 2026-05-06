import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SendMailOutput = {
  messageId: string;
  accepted: Array<string | { address: string }>;
  rejected: Array<string | { address: string }>;
  response: string;
};

type SendEmailResult = { success: boolean; data?: unknown; error?: Error };

type EmailServiceLike = {
  sendEmail: (emailData: { to: string[]; subject: string; html: string; text?: string }) => Promise<SendEmailResult>;
};

type EmailServiceInternals = EmailServiceLike & {
  transporter: {
    sendMail: (input: Record<string, unknown>) => Promise<SendMailOutput>;
    verify: () => Promise<void>;
  } | null;
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

describe('server/email-service.js wave13 plato', () => {
  it('sendEmail wraps transporter failure and preserves thrown string details', async () => {
    const { emailService } = loadServiceModule();
    const service = emailService as EmailServiceInternals;

    service.transporter = {
      sendMail: async () => {
        throw 'smtp-down-wave13';
      },
      verify: async () => undefined,
    };

    service.config = {
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: { user: 'noreply@example.com', pass: 'secret' },
      fromName: 'Komuno',
      fromEmail: 'noreply@example.com',
    };

    const result = await service.sendEmail({
      to: [' ADMIN@EXAMPLE.COM ', 'admin@example.com'],
      subject: 'Wave 13',
      html: '<p>Branche erreur</p>',
    });

    expect(result.success).toBe(false);
    if (result.error instanceof Error) {
      expect(result.error.message).toContain('Erreur envoi email');
      expect(result.error.message).toContain('smtp-down-wave13');
    } else {
      throw new Error('Expected an Error instance in result.error');
    }
  });
});
