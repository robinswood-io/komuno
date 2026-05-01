import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';

type ErrorsModule = typeof import('../../../shared/errors.js');

type CaptureStackTraceFn = (targetObject: object, constructorOpt?: Function) => void;

const cjsRequire = createRequire(import.meta.url);
const errorsModulePath = cjsRequire.resolve('../../../shared/errors.js');

function loadErrorsModule(): ErrorsModule {
  delete cjsRequire.cache[errorsModulePath];
  return cjsRequire(errorsModulePath) as ErrorsModule;
}

describe('shared/errors.js - iteration 12', () => {
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

  it('ApiError sets status/message/code/name and calls captureStackTrace when available', () => {
    const captureSpy = vi.fn<CaptureStackTraceFn>();
    Object.defineProperty(Error, 'captureStackTrace', {
      value: captureSpy,
      configurable: true,
      writable: true,
    });

    const { ApiError } = loadErrorsModule();
    const error = new ApiError(418, 'I am a teapot', 'TEAPOT');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(418);
    expect(error.message).toBe('I am a teapot');
    expect(error.code).toBe('TEAPOT');
    expect(captureSpy).toHaveBeenCalledTimes(1);
    expect(captureSpy).toHaveBeenCalledWith(error, error.constructor);
  });

  it('ApiError still initializes correctly when captureStackTrace is unavailable', () => {
    Object.defineProperty(Error, 'captureStackTrace', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { ApiError } = loadErrorsModule();
    const error = new ApiError(500, 'Boom', 'E500');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(500);
    expect(error.message).toBe('Boom');
    expect(error.code).toBe('E500');
  });

  it('NotFoundError uses defaults and custom values', () => {
    const { ApiError, NotFoundError } = loadErrorsModule();

    const defaultError = new NotFoundError();
    expect(defaultError).toBeInstanceOf(NotFoundError);
    expect(defaultError).toBeInstanceOf(ApiError);
    expect(defaultError.status).toBe(404);
    expect(defaultError.message).toBe('Resource not found');
    expect(defaultError.code).toBe('NOT_FOUND');

    const customError = new NotFoundError('Missing member', 'MEMBER_NOT_FOUND');
    expect(customError.status).toBe(404);
    expect(customError.message).toBe('Missing member');
    expect(customError.code).toBe('MEMBER_NOT_FOUND');
  });

  it('UnauthorizedError uses defaults and custom values', () => {
    const { ApiError, UnauthorizedError } = loadErrorsModule();

    const defaultError = new UnauthorizedError();
    expect(defaultError).toBeInstanceOf(UnauthorizedError);
    expect(defaultError).toBeInstanceOf(ApiError);
    expect(defaultError.status).toBe(401);
    expect(defaultError.message).toBe('Unauthorized');
    expect(defaultError.code).toBe('UNAUTHORIZED');

    const customError = new UnauthorizedError('Token expired', 'TOKEN_EXPIRED');
    expect(customError.status).toBe(401);
    expect(customError.message).toBe('Token expired');
    expect(customError.code).toBe('TOKEN_EXPIRED');
  });

  it('ForbiddenError uses defaults and custom values', () => {
    const { ApiError, ForbiddenError } = loadErrorsModule();

    const defaultError = new ForbiddenError();
    expect(defaultError).toBeInstanceOf(ForbiddenError);
    expect(defaultError).toBeInstanceOf(ApiError);
    expect(defaultError.status).toBe(403);
    expect(defaultError.message).toBe('Forbidden');
    expect(defaultError.code).toBe('FORBIDDEN');

    const customError = new ForbiddenError('Admin only', 'ADMIN_ONLY');
    expect(customError.status).toBe(403);
    expect(customError.message).toBe('Admin only');
    expect(customError.code).toBe('ADMIN_ONLY');
  });

  it('BadRequestError uses defaults and custom values', () => {
    const { ApiError, BadRequestError } = loadErrorsModule();

    const defaultError = new BadRequestError();
    expect(defaultError).toBeInstanceOf(BadRequestError);
    expect(defaultError).toBeInstanceOf(ApiError);
    expect(defaultError.status).toBe(400);
    expect(defaultError.message).toBe('Bad request');
    expect(defaultError.code).toBe('BAD_REQUEST');

    const customError = new BadRequestError('Invalid payload', 'INVALID_PAYLOAD');
    expect(customError.status).toBe(400);
    expect(customError.message).toBe('Invalid payload');
    expect(customError.code).toBe('INVALID_PAYLOAD');
  });

  it('InternalServerError uses defaults and custom values', () => {
    const { ApiError, InternalServerError } = loadErrorsModule();

    const defaultError = new InternalServerError();
    expect(defaultError).toBeInstanceOf(InternalServerError);
    expect(defaultError).toBeInstanceOf(ApiError);
    expect(defaultError.status).toBe(500);
    expect(defaultError.message).toBe('Internal server error');
    expect(defaultError.code).toBe('INTERNAL_SERVER_ERROR');

    const customError = new InternalServerError('Database down', 'DB_DOWN');
    expect(customError.status).toBe(500);
    expect(customError.message).toBe('Database down');
    expect(customError.code).toBe('DB_DOWN');
  });
});
