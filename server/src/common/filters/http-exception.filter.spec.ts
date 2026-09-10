import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter';
const loggerMocks = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('../../../lib/logger', () => ({ logger: loggerMocks })); vi.mock('nanoid', () => ({ nanoid: () => 'test-correlation-id' }));
function invoke(path: string, exception: unknown, headers: Record<string, string> = {}) {
  const json = vi.fn(); const response = { status: vi.fn().mockReturnValue({ json }), json };
  const request = { method: 'GET', path, query: {}, body: {}, headers };
  const host = { switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }) } as unknown as ArgumentsHost;
  new HttpExceptionFilter().catch(exception, host); return json.mock.calls[0][0] as Record<string, unknown>;
}
describe('HttpExceptionFilter', () => {
  beforeEach(() => vi.clearAllMocks());
  it('retourne code stable, message français et corrélation', () => {
    const payload = invoke('/api/loans', new HttpException('validation', HttpStatus.BAD_REQUEST));
    expect(payload).toEqual({ success: false, code: 'LOANS_OPERATION_FAILED_REQUEST_INVALID', message: 'La demande est invalide. Vérifiez les informations saisies.', correlationId: 'test-correlation-id', errorId: 'test-correlation-id' });
  });
  it.each(['/api/loans','/api/branding','/api/forms','/api/admin/finance'])('ne divulgue aucun détail technique pour %s', (path) => {
    const secret = 'postgresql://user:password@db/private token=abcdefghijklmnopqrstuvwxyz012345 /srv/storage/private Error: stack';
    const payload = invoke(path, new Error(secret)); const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('postgresql'); expect(serialized).not.toContain('/srv/'); expect(serialized).not.toContain('stack'); expect(serialized).not.toContain('abcdefghijklmnopqrstuvwxyz012345'); expect(serialized).toContain('correlationId');
  });
  it('réutilise uniquement un identifiant de corrélation valide', () => { expect(invoke('/api/forms', new Error('x'), {'x-correlation-id':'request-123456'}).correlationId).toBe('request-123456'); });
});
