import type { Request } from 'express';

interface RawBodyRequest extends Request {
  rawBody?: string | Buffer;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).length > 0;
}

function getRawBody(req: Request): string | null {
  const rawBody = (req as RawBodyRequest).rawBody;
  if (typeof rawBody === 'string') {
    return rawBody;
  }
  if (rawBody instanceof Buffer) {
    return rawBody.toString('utf8');
  }
  return null;
}

function safeParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function resolveRequestBody<T>(body: T, req: Request): T | unknown {
  if (isNonEmptyRecord(body)) {
    return body;
  }

  const rawBody = getRawBody(req);
  if (!rawBody) {
    return body;
  }

  const parsed = safeParseJson(rawBody);
  return parsed ?? body;
}
