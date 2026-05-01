import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import {
  TransformResponseInterceptor,
  type ApiResponse,
} from './transform-response.interceptor';

const context = {} as ExecutionContext;

describe('TransformResponseInterceptor', () => {
  it('maps a standard payload into the api response format', async () => {
    const interceptor = new TransformResponseInterceptor<{ id: string; name: string }>();
    const payload = { id: '1', name: 'Alice' };
    const next: CallHandler<{ id: string; name: string }> = {
      handle: () => of(payload),
    };

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual({
      success: true,
      data: payload,
    });
  });

  it('returns an already mapped response without transforming it again', async () => {
    const interceptor = new TransformResponseInterceptor<ApiResponse<{ id: string }>>();
    const mappedPayload: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: '42' },
      message: 'already mapped',
    };
    const next: CallHandler<ApiResponse<{ id: string }>> = {
      handle: () => of(mappedPayload),
    };

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual(mappedPayload);
  });

  it('maps null and undefined to a simple success response', async () => {
    const nullInterceptor = new TransformResponseInterceptor<null>();
    const undefinedInterceptor = new TransformResponseInterceptor<undefined>();

    const nullResult = await firstValueFrom(
      nullInterceptor.intercept(context, { handle: () => of(null) }),
    );
    const undefinedResult = await firstValueFrom(
      undefinedInterceptor.intercept(context, { handle: () => of(undefined) }),
    );

    expect(nullResult).toEqual({ success: true });
    expect(undefinedResult).toEqual({ success: true });
  });

  it('propagates handler errors without mapping them', async () => {
    const interceptor = new TransformResponseInterceptor<{ id: string }>();
    const error = new Error('unexpected failure');
    const next: CallHandler<{ id: string }> = {
      handle: () => throwError(() => error),
    };

    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toBe(error);
  });
});
