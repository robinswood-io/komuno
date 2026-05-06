import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { resolveRequestBody } from './request-body';

type BodyInput =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null
  | undefined
  | RegExp
  | Set<string>;

function makeRequest(rawBody?: string | Buffer | unknown): Request {
  return { rawBody } as Request;
}

describe('resolveRequestBody iteration132-141', () => {
  it('iteration132: parse un nombre négatif en JSON', () => {
    const body: BodyInput = 'fallback';
    const req = makeRequest('-17');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(-17);
  });

  it('iteration133: parse un nombre décimal en JSON', () => {
    const body: BodyInput = 'fallback';
    const req = makeRequest('3.1415');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(3.1415);
  });

  it('iteration134: parse un tableau JSON vide', () => {
    const body: BodyInput = null;
    const req = makeRequest('[]');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual([]);
  });

  it('iteration135: parse un JSON nested depuis un Buffer UTF-8', () => {
    const body: BodyInput = undefined;
    const req = makeRequest(Buffer.from('{"user":{"id":1,"active":true}}', 'utf8'));

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ user: { id: 1, active: true } });
  });

  it('iteration136: garde le body quand rawBody string invalide finit par une virgule', () => {
    const body: BodyInput = { keep: true };
    const req = makeRequest('{"x":1,}');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration137: traite un RegExp comme body vide et parse rawBody', () => {
    const body: BodyInput = /abc/gi;
    const req = makeRequest('{"fromRegExp":true}');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ fromRegExp: true });
  });

  it('iteration138: traite un Set comme body vide et parse rawBody', () => {
    const body: BodyInput = new Set<string>(['a', 'b']);
    const req = makeRequest('{"fromSet":2}');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ fromSet: 2 });
  });

  it('iteration139: conserve un objet body non vide et ignore rawBody Buffer', () => {
    const body: Record<string, unknown> = { stable: 1 };
    const req = makeRequest(Buffer.from('{"override":999}', 'utf8'));

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration140: garde le body quand rawBody string contient un BOM invalide pour JSON.parse', () => {
    const body: BodyInput = 'original';
    const req = makeRequest('\uFEFF{"a":1}');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration141: retourne body quand rawBody vaut la string "undefined"', () => {
    const body: BodyInput = 123;
    const req = makeRequest('undefined');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });
});
