import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { resolveRequestBody } from './request-body';

type BodyInput = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

function makeRequest(rawBody?: string | Buffer | unknown): Request {
  return { rawBody } as Request;
}

describe('resolveRequestBody iteration102-111', () => {
  it('iteration102: retourne body si rawBody string ne contient que des espaces', () => {
    const body: BodyInput = [];
    const req = makeRequest('   ');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration103: retourne body quand rawBody JSON est null (fallback nullish)', () => {
    const body: BodyInput = 'original';
    const req = makeRequest('null');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration104: retourne false quand rawBody JSON est false', () => {
    const body: BodyInput = 'fallback';
    const req = makeRequest('false');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(false);
  });

  it('iteration105: retourne 0 quand rawBody JSON est 0', () => {
    const body: BodyInput = 'fallback';
    const req = makeRequest('0');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(0);
  });

  it('iteration106: retourne body quand rawBody est un Buffer vide', () => {
    const body: BodyInput = { preserved: true };
    const req = makeRequest(Buffer.from('', 'utf8'));

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration107: parse correctement un Buffer UTF-8 en JSON valide', () => {
    const body: BodyInput = {};
    const req = makeRequest(Buffer.from('{"city":"Montréal","ok":true}', 'utf8'));

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ city: 'Montréal', ok: true });
  });

  it('iteration108: traite un objet Date (sans clés propres) comme body vide et parse rawBody', () => {
    const body: BodyInput = new Date('2026-01-01T00:00:00.000Z') as unknown as Record<string, unknown>;
    const req = makeRequest('{"fromDate":true}');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ fromDate: true });
  });

  it('iteration109: traite un objet avec props héritées uniquement comme body vide', () => {
    const proto = { inherited: 'value' };
    const body = Object.create(proto) as Record<string, unknown>;
    const req = makeRequest('{"fromProtoOnly":1}');

    const result = resolveRequestBody(body, req);

    expect(result).toEqual({ fromProtoOnly: 1 });
  });

  it('iteration110: garde un body objet non vide même si rawBody serait valide', () => {
    const body = { a: 1, b: 2 };
    const req = makeRequest('{"override":true}');

    const result = resolveRequestBody(body, req);

    expect(result).toBe(body);
  });

  it('iteration111: parse un JSON string depuis rawBody et renvoie la string parsée', () => {
    const body: BodyInput = undefined;
    const req = makeRequest('"hello-json"');

    const result = resolveRequestBody(body, req);

    expect(result).toBe('hello-json');
  });
});
