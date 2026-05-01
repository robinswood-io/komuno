import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../shared/errors.js';

describe('shared/errors.js - iteration 21 captureStackTrace fallback branch', () => {
  it('constructs ApiError when Error.captureStackTrace is unavailable', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Error, 'captureStackTrace');

    Object.defineProperty(Error, 'captureStackTrace', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    try {
      const error = new ApiError(400, 'fallback branch', 'FALLBACK_BRANCH');

      expect(error).toBeInstanceOf(Error);
      expect(error.status).toBe(400);
      expect(error.message).toBe('fallback branch');
      expect(error.code).toBe('FALLBACK_BRANCH');
      expect(error.name).toBe('ApiError');
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(Error, 'captureStackTrace', originalDescriptor);
      } else {
        Reflect.deleteProperty(Error, 'captureStackTrace');
      }
    }
  });
});
