import { describe, expect, it } from 'vitest';

type SerializableRecord = Record<string | symbol, unknown>;

type LoggerTransport = {
  name?: string;
  level?: string;
};

type LoggerFormat = {
  options?: Record<string, unknown>;
  transform: (info: SerializableRecord, options?: unknown) => SerializableRecord | false;
};

type LoggerLike = {
  level: string;
  levels: Record<string, number>;
  format: LoggerFormat;
  transports: LoggerTransport[];
};

type LoggerModule = {
  logger: LoggerLike;
};

const MESSAGE_SYMBOL = Symbol.for('message');

const parseFormattedMessage = (formattedInfo: SerializableRecord): Record<string, unknown> => {
  const serialized = formattedInfo[MESSAGE_SYMBOL];
  expect(typeof serialized).toBe('string');
  return JSON.parse(serialized as string) as Record<string, unknown>;
};

describe('server/lib/logger.js - iteration 4 targeted tests', () => {
  it('exposes expected log levels and transports', async () => {
    const module = (await import('../../../server/lib/logger.js')) as LoggerModule;
    const { logger } = module;

    expect(['debug', 'info', 'warn', 'error']).toContain(logger.level);
    expect(logger.levels).toMatchObject({
      error: expect.any(Number),
      warn: expect.any(Number),
      info: expect.any(Number),
      debug: expect.any(Number),
    });

    expect(logger.transports.some((transport) => transport.name === 'console')).toBe(true);
    expect(logger.transports.some((transport) => transport.level === 'error')).toBe(true);
  });

  it('applies timestamped JSON format on log entries', async () => {
    const module = (await import('../../../server/lib/logger.js')) as LoggerModule;
    const { logger } = module;

    const formatted = logger.format.transform(
      {
        level: 'info',
        message: 'healthcheck completed',
        requestId: 'req-42',
      },
      logger.format.options,
    );

    expect(formatted).not.toBe(false);
    const safeFormatted = formatted as SerializableRecord;
    expect(typeof safeFormatted.timestamp).toBe('string');
    expect((safeFormatted.timestamp as string)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

    const parsed = parseFormattedMessage(safeFormatted);
    expect(parsed).toMatchObject({
      level: 'info',
      message: 'healthcheck completed',
      requestId: 'req-42',
      timestamp: expect.any(String),
    });
  });

  it('redacts sensitive payload fields recursively and at top-level', async () => {
    const module = (await import('../../../server/lib/logger.js')) as LoggerModule;
    const { logger } = module;

    const formatted = logger.format.transform(
      {
        level: 'info',
        message: 'web-push payload',
        token: 'token-secret',
        subscription: {
          endpoint: 'https://push.example/subscription/abc',
          auth: 'auth-secret',
          p256dh: 'p256dh-secret',
        },
        payload: {
          sessionId: 'session-secret',
          nested: {
            apiKey: 'api-key-secret',
            safe: 'visible-value',
          },
        },
      },
      logger.format.options,
    );

    expect(formatted).not.toBe(false);
    const parsed = parseFormattedMessage(formatted as SerializableRecord);

    expect(parsed.token).toBe('[REDACTED]');

    const parsedSubscription = parsed.subscription as Record<string, unknown>;
    expect(parsedSubscription.endpoint).toBe('https://push.example/subscription/abc');
    expect(parsedSubscription.auth).toBe('[REDACTED]');
    expect(parsedSubscription.p256dh).toBe('[REDACTED]');

    const parsedPayload = parsed.payload as Record<string, unknown>;
    expect(parsedPayload.sessionId).toBe('[REDACTED]');
    const nestedPayload = parsedPayload.nested as Record<string, unknown>;
    expect(nestedPayload.apiKey).toBe('[REDACTED]');
    expect(nestedPayload.safe).toBe('visible-value');
  });

  it('serializes Error metadata with message and stack', async () => {
    const module = (await import('../../../server/lib/logger.js')) as LoggerModule;
    const { logger } = module;

    const formatted = logger.format.transform(
      {
        level: 'error',
        message: 'smtp send failed',
        error: new Error('SMTP timeout'),
      },
      logger.format.options,
    );

    expect(formatted).not.toBe(false);
    const parsed = parseFormattedMessage(formatted as SerializableRecord);

    const parsedError = parsed.error as Record<string, unknown>;
    expect(parsedError.message).toBe('SMTP timeout');
    expect(typeof parsedError.stack).toBe('string');
    expect((parsedError.stack as string)).toContain('SMTP timeout');
  });
});
