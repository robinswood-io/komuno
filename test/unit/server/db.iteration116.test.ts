import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

type DrizzleCallArg = {
  logger?: false | { logQuery: (query: string, params: unknown) => void };
};

type DrizzleModule = {
  drizzle: ReturnType<typeof vi.fn<[DrizzleCallArg], unknown>>;
};

const cjsRequire = createRequire(import.meta.url);

describe('server/db.js iteration116 standard development logger branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('passes a logger object to node-postgres drizzle in development', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
    });

    const pgDrizzle = cjsRequire('drizzle-orm/node-postgres') as DrizzleModule;
    const arg = pgDrizzle.drizzle.mock.calls[0]?.[0];

    expect(arg?.logger).not.toBe(false);
    expect(typeof (arg?.logger as { logQuery?: unknown })?.logQuery).toBe('function');

    const logger = arg?.logger as { logQuery: (query: string, params: unknown) => void };
    logger.logQuery('select 123', []);

    expect(consoleLogSpy).toHaveBeenCalledWith('[DB Query] select 123...');
  });
});
