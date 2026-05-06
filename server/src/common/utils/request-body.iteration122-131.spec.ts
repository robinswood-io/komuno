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
  | (() => void)
  | Map<string, unknown>;

function makeRequest(rawBody?: string | Buffer | unknown): Request {
  return { rawBody } as Request;
}

describe('resolveRequestBody iteration122-131', () => {
  it('iteration122: retourne true quand rawBody JSON est true', () => {
    const body: BodyInput = 'fallback';
    const req = makeRequest('true');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(true);
  });

  it('iteration123: parse un objet JSON vide depuis rawBody', () => {
    const body: BodyInput = null;
    const req = makeRequest('{}');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({});
  });

  it('iteration124: parse une string JSON vide et ne retombe pas sur body', () => {
    const body: BodyInput = 'fallback';
    const req = makeRequest('""');

    const result = resolveRequestBody(body, req);

    expect(result).toBe('');
  });

  it('iteration125: traite un objet avec clé non énumérable comme vide et parse rawBody', () => {
    const body: Record<string, unknown> = {};
    Object.defineProperty(body, 'hidden', { value: 1, enumerable: false });
    const req = makeRequest('{"fromHidden":true}');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ fromHidden: true });
  });

  it('iteration126: garde un objet avec clé énumérable même si la valeur est undefined', () => {
    const body: Record<string, unknown> = { present: undefined };
    const req = makeRequest('{"override":true}');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration127: traite un Map comme body vide et parse rawBody', () => {
    const body: BodyInput = new Map<string, unknown>([['k', 'v']]);
    const req = makeRequest('{"fromMap":true}');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ fromMap: true });
  });

  it('iteration128: parse rawBody quand body est une fonction', () => {
    const body: BodyInput = () => undefined;
    const req = makeRequest('{"fromFunction":1}');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ fromFunction: 1 });
  });

  it('iteration129: retourne body si rawBody est un type non supporté (symbol)', () => {
    const body: BodyInput = 7;
    const req = makeRequest(Symbol('unsupported'));

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration130: retombe sur body quand un Buffer UTF-8 ne contient pas de JSON valide', () => {
    const body: BodyInput = { keep: 'original' };
    const req = makeRequest(Buffer.from([0xff, 0xfe, 0xfd]));

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration131: parse un JSON multi-lignes valide depuis rawBody string', () => {
    const body: BodyInput = undefined;
    const req = makeRequest('{\n  "multi": true,\n  "count": 2\n}');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ multi: true, count: 2 });
  });
});
