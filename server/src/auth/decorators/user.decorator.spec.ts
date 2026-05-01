import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { User } from './user.decorator';

type RequestLike = { user?: unknown };
type HttpHostLike = { getRequest: () => RequestLike };
type UserDecoratorFactory = (
  data: string | undefined,
  ctx: ExecutionContext,
) => unknown;
type RouteParamMetadata = {
  factory?: UserDecoratorFactory;
};
type RouteArgsMetadata = Record<string, RouteParamMetadata>;

const getUserDecoratorFactory = (): UserDecoratorFactory => {
  class TestController {
    test(@User('email') _user: unknown): void {
      void _user;
    }
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'test',
  ) as RouteArgsMetadata | undefined;

  if (!metadata) {
    throw new Error('Missing route args metadata for @User decorator');
  }

  const metadataKeys = Object.keys(metadata);
  const firstMetadataKey = metadataKeys[0];

  if (!firstMetadataKey) {
    throw new Error('No metadata key found for @User decorator');
  }

  const factory = metadata[firstMetadataKey]?.factory;

  if (!factory) {
    throw new Error('No factory found for @User decorator');
  }

  return factory;
};

const createExecutionContext = (request: RequestLike): ExecutionContext => {
  const context: Pick<ExecutionContext, 'switchToHttp'> = {
    switchToHttp: (): HttpHostLike => ({
      getRequest: (): RequestLike => request,
    }),
  };

  return context as ExecutionContext;
};

const createMalformedExecutionContext = (): ExecutionContext => {
  const context: Pick<ExecutionContext, 'switchToHttp'> = {
    switchToHttp: (): { getRequest?: () => RequestLike } => ({}),
  };

  return context as ExecutionContext;
};

describe('User decorator', () => {
  it('returns full user when no data key is provided', () => {
    const user = { id: 'u-1', email: 'user@example.com', role: 'admin' };
    const ctx = createExecutionContext({ user });
    const factory = getUserDecoratorFactory();

    const result = factory(undefined, ctx);

    expect(result).toEqual(user);
  });

  it('returns full user when empty data key is provided', () => {
    const user = { id: 'u-2', email: 'empty@example.com' };
    const ctx = createExecutionContext({ user });
    const factory = getUserDecoratorFactory();

    const result = factory('', ctx);

    expect(result).toEqual(user);
  });

  it('extracts a specific user property when data key exists', () => {
    const ctx = createExecutionContext({
      user: { id: 'u-3', email: 'extract@example.com' },
    });
    const factory = getUserDecoratorFactory();

    const result = factory('email', ctx);

    expect(result).toBe('extract@example.com');
  });

  it('returns undefined when requested property does not exist', () => {
    const ctx = createExecutionContext({
      user: { id: 'u-4' },
    });
    const factory = getUserDecoratorFactory();

    const result = factory('email', ctx);

    expect(result).toBeUndefined();
  });

  it('returns undefined when request has no user and a key is requested', () => {
    const ctx = createExecutionContext({});
    const factory = getUserDecoratorFactory();

    const result = factory('email', ctx);

    expect(result).toBeUndefined();
  });

  it('returns undefined when user is not an object and a key is requested', () => {
    const ctx = createExecutionContext({ user: 'not-an-object' });
    const factory = getUserDecoratorFactory();

    const result = factory('email', ctx);

    expect(result).toBeUndefined();
  });

  it('returns undefined when execution context is malformed', () => {
    const ctx = createMalformedExecutionContext();
    const factory = getUserDecoratorFactory();

    const result = factory('email', ctx);

    expect(result).toBeUndefined();
  });
});
