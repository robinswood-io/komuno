import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type ConnectionResult = { success: boolean; data?: boolean; error?: Error };

type EmailServiceLike = {
  testConnection: () => Promise<ConnectionResult>;
};

type EmailServiceInternals = EmailServiceLike & {
  transporter: {
    verify: () => Promise<void>;
    sendMail: (input: Record<string, unknown>) => Promise<unknown>;
  } | null;
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

describe('server/email-service.js wave15 plato', () => {
  it('testConnection wraps verify failure into a readable domain error', async () => {
    const { emailService } = loadServiceModule();
    const service = emailService as EmailServiceInternals;

    service.transporter = {
      verify: async () => {
        throw new Error('verify-failed-wave15');
      },
      sendMail: async () => ({ messageId: 'unused' }),
    };

    const result = await service.testConnection();

    expect(result.success).toBe(false);
    if (result.error instanceof Error) {
      expect(result.error.message).toContain('Test connexion échoué');
      expect(result.error.message).toContain('verify-failed-wave15');
    } else {
      throw new Error('Expected an Error instance in result.error');
    }
  });
});
