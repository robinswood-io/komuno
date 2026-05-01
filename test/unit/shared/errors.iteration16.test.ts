import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type ErrorsModule = typeof import('../../../shared/errors.js');

type CaptureStackTraceFn = (targetObject: object, constructorOpt?: Function) => void;

const cjsRequire = createRequire(import.meta.url);
const errorsModulePath = cjsRequire.resolve('../../../shared/errors.js');

function loadErrorsModule(): ErrorsModule {
  delete cjsRequire.cache[errorsModulePath];
  return cjsRequire(errorsModulePath) as ErrorsModule;
}

describe('shared/errors.js - iteration 16', () => {
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

  it('uses subclass constructor when captureStackTrace is invoked from ApiError', () => {
    const captureSpy = vi.fn<CaptureStackTraceFn>();
    Object.defineProperty(Error, 'captureStackTrace', {
      value: captureSpy,
      configurable: true,
      writable: true,
    });

    const { ForbiddenError } = loadErrorsModule();
    const error = new ForbiddenError('Denied');

    expect(captureSpy).toHaveBeenCalledTimes(1);
    expect(captureSpy).toHaveBeenCalledWith(error, ForbiddenError);
  });

  it('falls back to default codes when null is provided to constructors', () => {
    const nullCode = null as unknown as string;
    const { NotFoundError, UnauthorizedError } = loadErrorsModule();

    const notFound = new NotFoundError('Missing', nullCode);
    const unauthorized = new UnauthorizedError('Auth required', nullCode);

    expect(notFound.code).toBe('NOT_FOUND');
    expect(unauthorized.code).toBe('UNAUTHORIZED');
  });

  it('falls back to default codes when falsey non-string values are provided', () => {
    const falseCode = false as unknown as string;
    const zeroCode = 0 as unknown as string;
    const { BadRequestError, InternalServerError } = loadErrorsModule();

    const badRequest = new BadRequestError('Invalid body', falseCode);
    const internal = new InternalServerError('Unexpected', zeroCode);

    expect(badRequest.code).toBe('BAD_REQUEST');
    expect(internal.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('keeps truthy custom codes as-is, including uncommon string values', () => {
    const { ForbiddenError, InternalServerError } = loadErrorsModule();

    const forbidden = new ForbiddenError('Denied', '0');
    const internal = new InternalServerError('Crashed', '   ');

    expect(forbidden.code).toBe('0');
    expect(internal.code).toBe('   ');
  });
});
