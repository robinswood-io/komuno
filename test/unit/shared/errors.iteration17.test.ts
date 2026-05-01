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

describe('shared/errors.js - iteration 17', () => {
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

  it('keeps subclass instance name as "ApiError" because base constructor overrides it', () => {
    const { NotFoundError, UnauthorizedError } = loadErrorsModule();

    const notFound = new NotFoundError();
    const unauthorized = new UnauthorizedError();

    expect(notFound.name).toBe('ApiError');
    expect(unauthorized.name).toBe('ApiError');
  });

  it('does not apply fallback for custom ApiError status values (0 and undefined)', () => {
    const { ApiError } = loadErrorsModule();

    const zeroStatusError = new ApiError(0, 'zero status', 'ZERO_STATUS');
    const undefinedStatusError = new ApiError(
      undefined as unknown as number,
      'undefined status',
      'UNDEFINED_STATUS',
    );

    expect(zeroStatusError.status).toBe(0);
    expect(undefinedStatusError.status).toBeUndefined();
  });

  it('uses default subclass code when explicit undefined is passed', () => {
    const { ForbiddenError } = loadErrorsModule();

    const error = new ForbiddenError('No rights', undefined);

    expect(error.code).toBe('FORBIDDEN');
  });

  it('preserves truthy non-string code values as-is at runtime', () => {
    const { InternalServerError } = loadErrorsModule();

    const runtimeCode = { key: 'INTERNAL_OBJECT_CODE' } as unknown as string;
    const error = new InternalServerError('Failure', runtimeCode);

    expect(error.code).toBe(runtimeCode);
  });

  it('lets captureStackTrace override the stack when provided', () => {
    const captureSpy = vi.fn<CaptureStackTraceFn>((targetObject) => {
      (targetObject as Error).stack = 'captured-stack';
    });
    Object.defineProperty(Error, 'captureStackTrace', {
      value: captureSpy,
      configurable: true,
      writable: true,
    });

    const { BadRequestError } = loadErrorsModule();
    const error = new BadRequestError('Payload issue');

    expect(captureSpy).toHaveBeenCalledTimes(1);
    expect(error.stack).toBe('captured-stack');
  });

  it('keeps a regular Error stack when captureStackTrace is unavailable', () => {
    Object.defineProperty(Error, 'captureStackTrace', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { ApiError } = loadErrorsModule();
    const error = new ApiError(500, 'stack fallback check', 'STACK_FALLBACK');

    expect(typeof error.stack).toBe('string');
    expect(error.stack).toContain('stack fallback check');
  });

  it('propagates errors thrown by captureStackTrace implementation', () => {
    const captureFailure = new Error('capture failed');
    const captureSpy = vi.fn<CaptureStackTraceFn>(() => {
      throw captureFailure;
    });
    Object.defineProperty(Error, 'captureStackTrace', {
      value: captureSpy,
      configurable: true,
      writable: true,
    });

    const { ApiError } = loadErrorsModule();

    expect(() => new ApiError(500, 'boom', 'CAPTURE_FAIL')).toThrow(captureFailure);
  });
});
