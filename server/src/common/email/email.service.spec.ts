import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import type { DrizzleDb } from '../database/types';

interface EmailDbConfigRow {
  host?: string | null;
  port?: number | null;
  secure?: boolean | null;
  username?: string | null;
  password?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
}

const mockState = vi.hoisted(() => ({
  dbConfig: null as EmailDbConfigRow | null,
  sendMailError: null as Error | null,
  dbError: null as Error | null,
}));

const sendMailMock = vi.hoisted(() => vi.fn(async () => {
  if (mockState.sendMailError) {
    throw mockState.sendMailError;
  }
}));

const createTransportMock = vi.hoisted(() => vi.fn(() => ({
  sendMail: sendMailMock,
})));

vi.mock('nodemailer', () => ({
  createTransport: createTransportMock,
}));

vi.mock('../../../../shared/schema', () => ({
  emailConfig: {},
}));

describe('EmailService', () => {
  const makeConfigService = (values: Record<string, string | undefined>): ConfigService => {
    const get = (key: string): string | undefined => values[key];
    return { get } as unknown as ConfigService;
  };

  const makeDb = (): DrizzleDb => {
    const limit = vi.fn(async () => {
      if (mockState.dbError) {
        throw mockState.dbError;
      }
      if (!mockState.dbConfig) {
        return [] as EmailDbConfigRow[];
      }
      return [mockState.dbConfig] as EmailDbConfigRow[];
    });

    const from = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ from }));

    return { select } as unknown as DrizzleDb;
  };

  beforeEach(() => {
    mockState.dbConfig = null;
    mockState.sendMailError = null;
    mockState.dbError = null;
    sendMailMock.mockClear();
    createTransportMock.mockClear();
  });

  it('should send email successfully using SMTP config from database', async () => {
    mockState.dbConfig = {
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      username: 'smtp-user@example.com',
      password: 'smtp-secret',
      fromName: 'Komuno',
      fromEmail: 'sender@example.com',
    };

    const service = new EmailService(makeConfigService({}), makeDb());

    await service.sendMail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<p>Hello</p>',
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: {
        user: 'smtp-user@example.com',
        pass: 'smtp-secret',
      },
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: '"Komuno" <sender@example.com>',
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<p>Hello</p>',
    });
  });

  it('should propagate transporter error when sending email fails', async () => {
    mockState.dbConfig = {
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      username: 'smtp-user@example.com',
      password: 'smtp-secret',
      fromName: 'Komuno',
      fromEmail: 'sender@example.com',
    };
    mockState.sendMailError = new Error('SMTP unavailable');

    const service = new EmailService(makeConfigService({}), makeDb());

    await expect(
      service.sendMail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
      })
    ).rejects.toThrow('SMTP unavailable');
  });

  it('should use DB defaults when optional DB fields are missing', async () => {
    mockState.dbConfig = {
      host: undefined,
      port: undefined,
      secure: undefined,
      username: 'smtp-user@example.com',
      password: 'smtp-secret',
      fromName: undefined,
      fromEmail: undefined,
    };

    const service = new EmailService(makeConfigService({}), makeDb());

    await service.sendMail({
      to: 'recipient@example.com',
      subject: 'Default DB',
      html: '<p>Hi</p>',
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'ssl0.ovh.net',
      port: 465,
      secure: true,
      auth: {
        user: 'smtp-user@example.com',
        pass: 'smtp-secret',
      },
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: '"Komuno" <smtp-user@example.com>',
      to: 'recipient@example.com',
      subject: 'Default DB',
      html: '<p>Hi</p>',
    });
  });

  it('should fallback to env SMTP config when DB config has no credentials', async () => {
    mockState.dbConfig = {
      host: 'smtp-db.example.com',
      port: 465,
      secure: true,
      username: '',
      password: '',
    };

    const service = new EmailService(
      makeConfigService({
        SMTP_HOST: 'smtp-env.example.com',
        SMTP_PORT: '2525',
        SMTP_SECURE: 'true',
        SMTP_USER: 'env-user',
        SMTP_PASS: 'env-pass',
        SMTP_FROM: 'env-from@example.com',
      }),
      makeDb(),
    );

    await service.sendMail({
      to: 'recipient@example.com',
      subject: 'Env fallback',
      html: '<p>Env</p>',
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp-env.example.com',
      port: 2525,
      secure: true,
      auth: {
        user: 'env-user',
        pass: 'env-pass',
      },
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'env-from@example.com',
      to: 'recipient@example.com',
      subject: 'Env fallback',
      html: '<p>Env</p>',
    });
  });

  it('should fallback to env config when DB read throws', async () => {
    mockState.dbError = new Error('db unavailable');

    const service = new EmailService(
      makeConfigService({
        SMTP_HOST: 'smtp-env.example.com',
        SMTP_USER: 'env-user',
        SMTP_PASS: 'env-pass',
      }),
      makeDb(),
    );

    await service.sendMail({
      to: 'recipient@example.com',
      subject: 'DB error fallback',
      html: '<p>Fallback</p>',
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp-env.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'env-user',
        pass: 'env-pass',
      },
    });
  });

  it('should simulate email and skip transporter when no DB config and no SMTP_HOST', async () => {
    const service = new EmailService(makeConfigService({}), makeDb());

    await expect(service.sendMail({
      to: 'recipient@example.com',
      subject: 'No SMTP',
      html: '<p>No SMTP</p>',
    })).resolves.toBeUndefined();

    expect(createTransportMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('should initialize transporter only once (lazy init cache)', async () => {
    mockState.dbConfig = {
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      username: 'smtp-user@example.com',
      password: 'smtp-secret',
      fromName: 'Komuno',
      fromEmail: 'sender@example.com',
    };

    const service = new EmailService(makeConfigService({}), makeDb());

    await service.sendMail({
      to: 'first@example.com',
      subject: 'First',
      html: '<p>First</p>',
    });
    await service.sendMail({
      to: 'second@example.com',
      subject: 'Second',
      html: '<p>Second</p>',
    });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });
});
