import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../../shared/errors';
import { HttpExceptionFilter } from './http-exception.filter';

const loggerMocks = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('../../../lib/logger', () => ({ logger: loggerMocks }));
vi.mock('nanoid', () => ({ nanoid: () => 'iter-error-id' }));

function run(exception: unknown, request: Record<string, unknown> = {}) {
  const json = vi.fn();
  const response = { status: vi.fn().mockReturnValue({ json }), json };
  const req = { method: 'GET', path: '/api/x', query: {}, body: {}, headers: {}, ...request };
  const host = { switchToHttp: () => ({ getRequest: () => req, getResponse: () => response }) } as unknown as ArgumentsHost;
  new HttpExceptionFilter().catch(exception, host);
  return { payload: json.mock.calls[0][0] as Record<string, unknown>, log: loggerMocks.error.mock.calls[0][1] as Record<string, unknown> };
}

describe('HttpExceptionFilter secure compatibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('conserve un code ApiError stable sans exposer son message', () => {
    const { payload } = run(new ApiError(409, 'postgresql://private', 'DOMAIN_INVALID'));
    expect(payload.code).toBe('DOMAIN_INVALID');
    expect(payload.message).toBe('Cette action est en conflit avec les données existantes. Actualisez puis réessayez.');
    expect(JSON.stringify(payload)).not.toContain('postgresql');
  });

  it('masque toujours une erreur interne, quel que soit NODE_ENV', () => {
    process.env.NODE_ENV = 'development';
    const { payload } = run(new HttpException('/srv/storage/private stack token=abcdefghijklmnopqrstuvwxyz', HttpStatus.INTERNAL_SERVER_ERROR));
    expect(payload).toMatchObject({ success: false, code: 'INTERNAL_ERROR', correlationId: 'iter-error-id' });
    expect(JSON.stringify(payload)).not.toMatch(/\/srv|stack|abcdefghijklmnopqrstuvwxyz/);
  });

  it('masque récursivement les données sensibles des journaux', () => {
    const { log } = run(new Error('failure'), {
      query: { token: 'secret', page: '1' },
      body: { nested: { password: 'secret', keep: 'ok' }, items: [{ api_key: 'secret' }] },
    });
    expect(log.query).toEqual({ token: '[REDACTED]', page: '1' });
    expect(log.body).toEqual({ nested: { password: '[REDACTED]', keep: 'ok' }, items: [{ api_key: '[REDACTED]' }] });
  });

  it('journalise la corrélation et les métadonnées de requête', () => {
    const { log } = run(new Error('failure'), { method: 'POST', path: '/api/forms', user: { email: 'admin@example.com' } });
    expect(log).toMatchObject({ correlationId: 'iter-error-id', method: 'POST', path: '/api/forms', user: 'admin@example.com', statusCode: 500 });
  });
});
