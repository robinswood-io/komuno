import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import type { CircuitBreakerConfig } from '../../../server/lib/circuit-breaker';

type CircuitBreakerJsModule = typeof import('../../../server/lib/circuit-breaker');
type LoggerMethod = (message: string, metadata?: unknown) => void;
type LoggerMock = {
  info: ReturnType<typeof vi.fn<LoggerMethod>>;
  warn: ReturnType<typeof vi.fn<LoggerMethod>>;
  error: ReturnType<typeof vi.fn<LoggerMethod>>;
};

type LoadModuleResult = {
  module: CircuitBreakerJsModule;
  loggerMock: LoggerMock;
};

const cjsRequire = createRequire(import.meta.url);
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const circuitBreakerModulePath = cjsRequire.resolve('../../../server/lib/circuit-breaker.js');

const loadCircuitBreakerModule = (): LoadModuleResult => {
  const loggerMock: LoggerMock = {
    info: vi.fn<LoggerMethod>(),
    warn: vi.fn<LoggerMethod>(),
    error: vi.fn<LoggerMethod>(),
  };

  const previousLoggerModule = cjsRequire.cache[loggerModulePath];
  cjsRequire.cache[loggerModulePath] = {
    ...(previousLoggerModule ?? {
      id: loggerModulePath,
      filename: loggerModulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: { logger: loggerMock },
  };

  delete cjsRequire.cache[circuitBreakerModulePath];
  const module = cjsRequire(circuitBreakerModulePath) as CircuitBreakerJsModule;

  return { module, loggerMock };
};

describe('server/lib/circuit-breaker.js', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete cjsRequire.cache[circuitBreakerModulePath];
    delete cjsRequire.cache[loggerModulePath];
  });

  it('stays CLOSED on success and tracks metrics', async () => {
    const { module } = loadCircuitBreakerModule();

    const config: CircuitBreakerConfig = {
      name: 'success-path',
      failureThreshold: 2,
      successThreshold: 2,
      timeout: 5_000,
    };

    const breaker = new module.CircuitBreaker(config);

    const result = await breaker.execute(async () => 'ok');

    expect(result).toBe('ok');
    expect(breaker.getState()).toBe(module.CircuitState.CLOSED);
    expect(breaker.isOpen()).toBe(false);
    expect(breaker.getMetrics()).toMatchObject({
      state: module.CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      totalRequests: 1,
      totalFailures: 0,
      totalSuccesses: 1,
    });
  });

  it('transitions CLOSED -> OPEN after threshold and rejects while OPEN', async () => {
    const { module } = loadCircuitBreakerModule();

    const config: CircuitBreakerConfig = {
      name: 'open-path',
      failureThreshold: 2,
      successThreshold: 1,
      timeout: 60_000,
    };

    const breaker = new module.CircuitBreaker(config);

    await expect(
      breaker.execute(async () => {
        throw new Error('first-failure');
      }),
    ).rejects.toThrow('first-failure');

    await expect(
      breaker.execute(async () => {
        throw new Error('second-failure');
      }),
    ).rejects.toThrow('second-failure');

    expect(breaker.getState()).toBe(module.CircuitState.OPEN);

    const blockedCall = vi.fn(async () => 'should-not-run');
    await expect(breaker.execute(blockedCall)).rejects.toThrow('Circuit breaker is OPEN');
    expect(blockedCall).not.toHaveBeenCalled();
  });

  it('transitions OPEN -> HALF_OPEN -> CLOSED after timeout and recovery successes', async () => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-01-01T00:00:00.000Z');
    vi.setSystemTime(baseTime);

    const { module } = loadCircuitBreakerModule();

    const config: CircuitBreakerConfig = {
      name: 'recovery-path',
      failureThreshold: 1,
      successThreshold: 2,
      timeout: 5_000,
    };

    const breaker = new module.CircuitBreaker(config);

    await expect(
      breaker.execute(async () => {
        throw new Error('initial-down');
      }),
    ).rejects.toThrow('initial-down');
    expect(breaker.getState()).toBe(module.CircuitState.OPEN);

    const blockedCall = vi.fn(async () => 'blocked');
    await expect(breaker.execute(blockedCall)).rejects.toThrow('Circuit breaker is OPEN');
    expect(blockedCall).not.toHaveBeenCalled();

    vi.setSystemTime(new Date(baseTime.getTime() + 5_000));
    await expect(breaker.execute(async () => 'first-recovery')).resolves.toBe('first-recovery');
    expect(breaker.getState()).toBe(module.CircuitState.HALF_OPEN);

    await expect(breaker.execute(async () => 'second-recovery')).resolves.toBe('second-recovery');
    expect(breaker.getState()).toBe(module.CircuitState.CLOSED);
    expect(breaker.isOpen()).toBe(false);
  });

  it('resets timeout window after HALF_OPEN failure and retries only after new timeout', async () => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-01-01T00:00:00.000Z');
    vi.setSystemTime(baseTime);

    const { module } = loadCircuitBreakerModule();

    const config: CircuitBreakerConfig = {
      name: 'half-open-reset-timeout',
      failureThreshold: 1,
      successThreshold: 1,
      timeout: 3_000,
      resetTimeout: 15_000,
    };

    const breaker = new module.CircuitBreaker(config);

    await expect(
      breaker.execute(async () => {
        throw new Error('initial-failure');
      }),
    ).rejects.toThrow('initial-failure');
    expect(breaker.getState()).toBe(module.CircuitState.OPEN);

    vi.setSystemTime(new Date(baseTime.getTime() + 3_000));
    await expect(
      breaker.execute(async () => {
        throw new Error('half-open-failure');
      }),
    ).rejects.toThrow('half-open-failure');
    expect(breaker.getState()).toBe(module.CircuitState.OPEN);

    vi.setSystemTime(new Date(baseTime.getTime() + 3_001));
    const tooEarlyCall = vi.fn(async () => 'too-early');
    await expect(breaker.execute(tooEarlyCall)).rejects.toThrow('Circuit breaker is OPEN');
    expect(tooEarlyCall).not.toHaveBeenCalled();

    vi.setSystemTime(new Date(baseTime.getTime() + 6_000));
    await expect(breaker.execute(async () => 'recovered')).resolves.toBe('recovered');
    expect(breaker.getState()).toBe(module.CircuitState.CLOSED);
  });

  it('handles non-Error rejections and supports manual reset()', async () => {
    const { module, loggerMock } = loadCircuitBreakerModule();

    const config: CircuitBreakerConfig = {
      name: 'manual-reset',
      failureThreshold: 1,
      successThreshold: 1,
      timeout: 10_000,
    };

    const breaker = new module.CircuitBreaker(config);

    await expect(
      breaker.execute(async () => {
        throw 'panic-string';
      }),
    ).rejects.toBe('panic-string');

    expect(breaker.getState()).toBe(module.CircuitState.OPEN);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[CircuitBreaker] manual-reset - Failure (1/1)',
      expect.objectContaining({
        error: 'panic-string',
      }),
    );

    breaker.reset();
    expect(breaker.getState()).toBe(module.CircuitState.CLOSED);
    expect(breaker.getMetrics()).toMatchObject({
      state: module.CircuitState.CLOSED,
      failures: 0,
      successes: 0,
    });
  });
});
