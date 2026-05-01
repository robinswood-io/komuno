import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ZodValidationPipe } from './validation.pipe';

describe('ZodValidationPipe', () => {
  const userSchema = z.object({
    name: z.string().min(2),
    age: z.number().int().positive(),
  });

  const bodyMetadata: ArgumentMetadata = {
    type: 'body',
    metatype: undefined,
    data: undefined,
  };

  const customMetadata: ArgumentMetadata = {
    type: 'custom',
    metatype: undefined,
    data: undefined,
  };

  it('returns parsed DTO when payload is valid', () => {
    const pipe = new ZodValidationPipe(userSchema);
    const payload = { name: 'Alice', age: 32 };

    const result = pipe.transform(payload, bodyMetadata);

    expect(result).toEqual(payload);
  });

  it('throws BadRequestException when DTO is invalid', () => {
    const pipe = new ZodValidationPipe(userSchema);
    const payload = { name: 'A', age: -1 };

    expect(() => pipe.transform(payload, bodyMetadata)).toThrow(BadRequestException);
  });

  it('surfaces validation error details in the exception message', () => {
    const pipe = new ZodValidationPipe(userSchema);
    const payload = { name: '', age: 0 };

    try {
      pipe.transform(payload, bodyMetadata);
      throw new Error('Expected validation to fail');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BadRequestException);

      if (!(error instanceof BadRequestException)) {
        return;
      }

      const response = error.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : typeof response === 'object' && response !== null && 'message' in response
            ? String(response.message)
            : '';

      expect(message).toContain('Validation error');
      expect(message).toContain('name');
      expect(message).toContain('age');
    }
  });

  it('skips validation when metadata.type is custom', () => {
    const pipe = new ZodValidationPipe(userSchema);
    const invalidPayload = { name: '', age: -99 };

    const result = pipe.transform(invalidPayload, customMetadata);

    expect(result).toEqual(invalidPayload);
  });

  it('validates explicit request data for query and param metadata types', () => {
    const idSchema = z.object({ id: z.string().uuid() });
    const pipe = new ZodValidationPipe(idSchema);

    const queryMetadata: ArgumentMetadata = {
      type: 'query',
      metatype: undefined,
      data: undefined,
    };
    const paramMetadata: ArgumentMetadata = {
      type: 'param',
      metatype: undefined,
      data: undefined,
    };

    const validUuid = { id: '550e8400-e29b-41d4-a716-446655440000' };

    expect(pipe.transform(validUuid, queryMetadata)).toEqual(validUuid);
    expect(pipe.transform(validUuid, paramMetadata)).toEqual(validUuid);
    expect(() => pipe.transform({ id: 'not-a-uuid' }, queryMetadata)).toThrow(BadRequestException);
    expect(() => pipe.transform({ id: 'not-a-uuid' }, paramMetadata)).toThrow(BadRequestException);
  });
});
