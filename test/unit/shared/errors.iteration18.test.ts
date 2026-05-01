import { describe, expect, it } from 'vitest';
import {
  ApiError,
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '../../../shared/errors.js';

describe('shared/errors.js - iteration 18 complete class coverage', () => {
  it('ApiError sets status/message/code/name', () => {
    const err = new ApiError(418, 'teapot', 'TEAPOT');
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(418);
    expect(err.message).toBe('teapot');
    expect(err.code).toBe('TEAPOT');
    expect(err.name).toBe('ApiError');
  });

  it('NotFoundError default and custom values', () => {
    const def = new NotFoundError();
    const custom = new NotFoundError('missing', 'CUSTOM_404');

    expect(def.status).toBe(404);
    expect(def.message).toBe('Resource not found');
    expect(def.code).toBe('NOT_FOUND');

    expect(custom.status).toBe(404);
    expect(custom.message).toBe('missing');
    expect(custom.code).toBe('CUSTOM_404');
  });

  it('UnauthorizedError default and custom values', () => {
    const def = new UnauthorizedError();
    const custom = new UnauthorizedError('auth needed', 'AUTH_X');

    expect(def.status).toBe(401);
    expect(def.message).toBe('Unauthorized');
    expect(def.code).toBe('UNAUTHORIZED');

    expect(custom.status).toBe(401);
    expect(custom.message).toBe('auth needed');
    expect(custom.code).toBe('AUTH_X');
  });

  it('ForbiddenError default and custom values', () => {
    const def = new ForbiddenError();
    const custom = new ForbiddenError('forbidden area', 'FORBIDDEN_X');

    expect(def.status).toBe(403);
    expect(def.message).toBe('Forbidden');
    expect(def.code).toBe('FORBIDDEN');

    expect(custom.status).toBe(403);
    expect(custom.message).toBe('forbidden area');
    expect(custom.code).toBe('FORBIDDEN_X');
  });

  it('BadRequestError default and custom values', () => {
    const def = new BadRequestError();
    const custom = new BadRequestError('bad payload', 'BAD_X');

    expect(def.status).toBe(400);
    expect(def.message).toBe('Bad request');
    expect(def.code).toBe('BAD_REQUEST');

    expect(custom.status).toBe(400);
    expect(custom.message).toBe('bad payload');
    expect(custom.code).toBe('BAD_X');
  });

  it('InternalServerError default and custom values', () => {
    const def = new InternalServerError();
    const custom = new InternalServerError('server down', 'ISE_X');

    expect(def.status).toBe(500);
    expect(def.message).toBe('Internal server error');
    expect(def.code).toBe('INTERNAL_SERVER_ERROR');

    expect(custom.status).toBe(500);
    expect(custom.message).toBe('server down');
    expect(custom.code).toBe('ISE_X');
  });
});
