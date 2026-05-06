import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { resolveRequestBody } from './request-body';

type BodyInput = Record<string, unknown> | unknown[] | string | number | null | undefined;

function makeRequest(rawBody?: string | Buffer | unknown): Request {
  return { rawBody } as Request;
}

describe('resolveRequestBody iteration92-101', () => {
  it('iteration92: returns non-empty object body directly without parsing rawBody', () => {
    const body = { keep: true };
    const req = makeRequest('{"override":true}');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration93: returns original empty object when rawBody is missing', () => {
    const body: Record<string, unknown> = {};
    const req = makeRequest(undefined);

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration94: parses valid JSON object from raw string', () => {
    const body: Record<string, unknown> = {};
    const req = makeRequest('{"a":1,"b":"x"}');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ a: 1, b: 'x' });
  });

  it('iteration95: parses valid JSON array from raw string', () => {
    const body: Record<string, unknown> = {};
    const req = makeRequest('[1,2,3]');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual([1, 2, 3]);
  });

  it('iteration96: parses valid JSON primitive from raw string', () => {
    const body: Record<string, unknown> = {};
    const req = makeRequest('42');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(42);
  });

  it('iteration97: keeps original body when rawBody is empty string', () => {
    const body: Record<string, unknown> = {};
    const req = makeRequest('');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration98: parses valid JSON from raw buffer', () => {
    const body: Record<string, unknown> = {};
    const req = makeRequest(Buffer.from('{"buffered":true}', 'utf8'));

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ buffered: true });
  });

  it('iteration99: falls back to body when raw buffer contains invalid JSON', () => {
    const body: Record<string, unknown> = {};
    const req = makeRequest(Buffer.from('{invalid-json', 'utf8'));

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration100: parses rawBody when input body is null', () => {
    const body: BodyInput = null;
    const req = makeRequest('{"fromNull":true}');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ fromNull: true });
  });

  it('iteration101: keeps array body when rawBody is unsupported type', () => {
    const body: BodyInput = ['already', 'array'];
    const req = makeRequest({ unsupported: true });

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });
});
