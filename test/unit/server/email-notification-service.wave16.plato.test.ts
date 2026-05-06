import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SendMailOutput = {
  messageId: string;
  accepted: Array<string | { address: string }>;
  rejected: Array<string | { code: number }>;
  response: string;
};

type SendEmailResult = {
  success: boolean;
  data?: { messageId: string; accepted: string[]; rejected: string[]; response: string };
  error?: Error;
};

type EmailServiceLike = {
  sendEmail: (emailData: { to: string[]; subject: string; html: string; text?: string }) => Promise<SendEmailResult>;
};

type EmailServiceInternals = EmailServiceLike & {
  transporter: {
    sendMail: ReturnType<typeof vi.fn<(input: Record<string, unknown>) => Promise<SendMailOutput>>>;
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

describe('server/email-service.js wave16 plato', () => {
  it('sendEmail normalizes recipients and maps transporter accepted/rejected values to strings', async () => {
    const { emailService } = loadServiceModule();
    const service = emailService as EmailServiceInternals;

    const sendMailMock = vi.fn(async () => ({
      messageId: 'wave16-message-id',
      accepted: [{ address: 'admin@example.com' }],
      rejected: [{ code: 550 }],
      response: '250 queued',
    }));

    service.transporter = {
      sendMail: sendMailMock,
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
      to: ['  ADMIN@EXAMPLE.COM ', 'admin@example.com', ''],
      subject: 'Wave 16',
      html: '<p>Micro-test</p>',
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);

    const sendPayload = sendMailMock.mock.calls[0]?.[0];
    expect(sendPayload?.to).toBe('admin@example.com');

    expect(result).toEqual({
      success: true,
      data: {
        messageId: 'wave16-message-id',
        accepted: ['[object Object]'],
        rejected: ['[object Object]'],
        response: '250 queued',
      },
    });
  });
});
