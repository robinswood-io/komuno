import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type ErrorsModule = typeof import('../../../shared/errors.js');

const cjsRequire = createRequire(import.meta.url);
const errorsModulePath = cjsRequire.resolve('../../../shared/errors.js');

function loadErrorsModule(): ErrorsModule {
  delete cjsRequire.cache[errorsModulePath];
  return cjsRequire(errorsModulePath) as ErrorsModule;
}

describe('shared/errors.js - iteration 15', () => {
  let originalCaptureStackTrace: typeof Error.captureStackTrace;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalCaptureStackTrace = Error.captureStackTrace;
  });

  afterEach(() => {
    Object.defineProperty(Error, 'captureStackTrace', {
      value: originalCaptureStackTrace,
      configurable: true,
      writable: true,
    });
  });

  it('ApiError n’appelle pas captureStackTrace quand la valeur est définie mais non fonctionnelle', () => {
    Object.defineProperty(Error, 'captureStackTrace', {
      value: 'not-a-function',
      configurable: true,
      writable: true,
    });

    const { ApiError } = loadErrorsModule();
    const error = new ApiError(409, 'Conflict', 'CONFLICT');

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe('Conflict');
    expect(error.code).toBe('CONFLICT');
    expect(error.name).toBe('ApiError');
  });

  it('utilise les codes par défaut des sous-classes quand code est une chaîne vide', () => {
    const {
      NotFoundError,
      UnauthorizedError,
      ForbiddenError,
      BadRequestError,
      InternalServerError,
    } = loadErrorsModule();

    const notFound = new NotFoundError('NF', '');
    const unauthorized = new UnauthorizedError('UA', '');
    const forbidden = new ForbiddenError('FB', '');
    const badRequest = new BadRequestError('BR', '');
    const internal = new InternalServerError('ISE', '');

    expect(notFound.code).toBe('NOT_FOUND');
    expect(unauthorized.code).toBe('UNAUTHORIZED');
    expect(forbidden.code).toBe('FORBIDDEN');
    expect(badRequest.code).toBe('BAD_REQUEST');
    expect(internal.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
