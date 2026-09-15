import { EventEmitter } from 'node:events';
import { createConnection, createServer, type AddressInfo } from 'node:net';
import type { ClientRequest, IncomingMessage } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { httpsRequestMock } = vi.hoisted(() => ({ httpsRequestMock: vi.fn() }));
vi.mock('node:https', () => ({ request: httpsRequestMock }));
import { createFederationPinnedLookup, requestFederationTarget } from '../../../server/src/federation/federation.utils';

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
function lookupResult(options: { all?: boolean; family?: number }, lookup = publicLookup) {
  return new Promise((resolve, reject) => {
    createFederationPinnedLookup(lookup)('tenant.example', options, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address, family });
    });
  });
}
function fixture(status = 200, headers: Record<string, string> = {}) {
  const response = new EventEmitter() as IncomingMessage;
  response.statusCode = status;
  response.statusMessage = 'test';
  response.headers = headers;
  response.destroy = vi.fn(() => response);
  response.resume = vi.fn(() => response);
  const request = new EventEmitter() as ClientRequest;
  request.write = vi.fn(() => true);
  request.end = vi.fn(() => request);
  request.destroy = vi.fn((error?: Error) => {
    if (error) queueMicrotask(() => request.emit('error', error));
    return request;
  });
  httpsRequestMock.mockImplementation((_url, _options, callback) => {
    queueMicrotask(() => callback(response));
    return request;
  });
  return { response, request };
}
async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Transport did not settle')), 150);
    })]);
  } finally { clearTimeout(timer!); }
}

beforeEach(() => { httpsRequestMock.mockReset(); });
describe('Federation Node transport contract', () => {
  it('preserves scalar lookup callback', async () => {
    await expect(lookupResult({ family: 4 })).resolves.toEqual({ address: '93.184.216.34', family: 4 });
  });
  it('returns an array for all:true, pinning only the validated selected address', async () => {
    await expect(lookupResult({ all: true })).resolves.toEqual({ address: [{ address: '93.184.216.34', family: 4 }], family: undefined });
  });
  it('honours IPv6 selection with all:true', async () => {
    const lookup = async () => [{ address: '93.184.216.34', family: 4 }, { address: '2606:4700:4700::1111', family: 6 }];
    await expect(lookupResult({ all: true, family: 6 }, lookup)).resolves.toEqual({ address: [{ address: '2606:4700:4700::1111', family: 6 }], family: undefined });
  });
  it('fails closed for mixed public/private answers with all:true', async () => {
    await expect(lookupResult({ all: true }, async () => [...await publicLookup(), { address: '127.0.0.1', family: 4 }])).rejects.toThrow('non-global');
  });
  it('propagates DNS failure', async () => {
    await expect(lookupResult({ all: true }, async () => { throw new Error('DNS failed'); })).rejects.toThrow('DNS failed');
  });
  it('satisfies native Node autoSelectFamily all:true callback contract on a loopback harness', async () => {
    const observed: unknown[] = [];
    const accepted = vi.fn(socket => socket.destroy());
    const server = createServer(accepted);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = createConnection({ host: 'localhost', port: (server.address() as AddressInfo).port, autoSelectFamily: true,
          lookup: (_host, options, callback) => {
            createFederationPinnedLookup(publicLookup)('tenant.example', options, (error, address, family) => {
              observed.push({ all: options.all, error, address, family });
              if (error) callback(error);
              else if (Array.isArray(address)) callback(null, [{ address: '127.0.0.1', family: 4 }]);
              else callback(null, address, family);
            });
          },
        });
        socket.once('connect', () => { socket.destroy(); resolve(); });
        socket.once('error', error => { socket.destroy(); reject(error); });
      });
      expect(observed).toEqual([{ all: true, error: null, address: [{ address: '93.184.216.34', family: 4 }], family: undefined }]);
      expect(accepted).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
  it('resolves a complete successful response', async () => {
    const { response } = fixture();
    const pending = requestFederationTarget('https://tenant.example/api');
    await Promise.resolve();
    response.emit('data', Buffer.from('{"ok":true}'));
    response.emit('end');
    response.emit('close');
    const result = await bounded(pending);
    expect(result.ok).toBe(true);
    expect(await result.text()).toBe('{"ok":true}');
  });
  it('retains a non-redirect HTTP error response', async () => {
    const { response } = fixture(404);
    const pending = requestFederationTarget('https://tenant.example/api');
    await Promise.resolve(); response.emit('end');
    expect(await bounded(pending)).toMatchObject({ ok: false, status: 404 });
  });
  it.each(['error', 'aborted', 'close'])('rejects interrupted response %s and closes the request', async event => {
    const { response, request } = fixture();
    const pending = bounded(requestFederationTarget('https://tenant.example/api'));
    const assertion = expect(pending).rejects.toThrow(event === 'error' ? 'stream failed' : /response (aborted|closed)/);
    await Promise.resolve();
    response.emit(event, ...(event === 'error' ? [new Error('stream failed')] : []));
    await assertion;
    expect(request.destroy).toHaveBeenCalled();
  });
  it.each([{}, { location: 'https://other.example' }])('rejects 3xx and closes rather than draining: %j', async headers => {
    const { response, request } = fixture(302, headers);
    await expect(bounded(requestFederationTarget('https://tenant.example/api'))).rejects.toThrow('redirects are not allowed');
    expect(request.destroy).toHaveBeenCalled();
    expect(response.destroy).toHaveBeenCalled();
    expect(response.resume).not.toHaveBeenCalled();
  });
  it('rejects oversized bodies', async () => {
    const { response, request } = fixture();
    const pending = bounded(requestFederationTarget('https://tenant.example/api', { maxResponseBytes: 2 }));
    const assertion = expect(pending).rejects.toThrow('exceeded the allowed size');
    await Promise.resolve(); response.emit('data', '123');
    await assertion; expect(request.destroy).toHaveBeenCalled(); expect(response.destroy).toHaveBeenCalled();
  });
  it('rejects cancellation after response headers', async () => {
    const { request } = fixture(); const controller = new AbortController();
    const pending = bounded(requestFederationTarget('https://tenant.example/api', { signal: controller.signal }));
    const assertion = expect(pending).rejects.toThrow('request aborted');
    await Promise.resolve(); controller.abort();
    await assertion; expect(request.destroy).toHaveBeenCalled();
  });
  it('does not send the request body when already cancelled', async () => {
    const { request } = fixture(); const controller = new AbortController(); controller.abort();
    await expect(bounded(requestFederationTarget('https://tenant.example/api', { signal: controller.signal, body: 'private' }))).rejects.toThrow('request aborted');
    expect(request.write).not.toHaveBeenCalled(); expect(request.end).not.toHaveBeenCalled();
  });
});
