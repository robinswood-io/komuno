import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SendEmailResult = { success: boolean; data?: unknown; error?: Error };

type EmailServiceLike = {
  sendEmail: (emailData: { to: string[]; subject: string; html: string; text?: string }) => Promise<SendEmailResult>;
};

type EmailServiceInternals = EmailServiceLike & {
  transporter: { sendMail: (input: Record<string, unknown>) => Promise<{ messageId: string; accepted: string[]; rejected: string[]; response: string }>; verify: () => Promise<void> } | null;
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

describe('server/email-service.js wave4 plato', () => {
  it('sendEmail rejects when all recipients normalize to empty values', async () => {
    const { emailService } = loadServiceModule();
    const service = emailService as EmailServiceInternals;

    service.transporter = {
      sendMail: async () => ({
        messageId: 'wave4-message-id',
        accepted: ['ok@example.com'],
        rejected: [],
        response: '250 OK',
      }),
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
      to: ['   ', '\n\t', ''],
      subject: 'Wave 4',
      html: '<p>Message de test</p>',
    });

    expect(result.success).toBe(false);
    if (result.error instanceof Error) {
      expect(result.error.message).toBe('Aucun destinataire valide fourni');
    } else {
      throw new Error('Expected an Error instance in result.error');
    }
  });
});
