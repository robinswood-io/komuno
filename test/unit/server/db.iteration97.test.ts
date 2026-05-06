import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

const cjsRequire = createRequire(import.meta.url);

describe('server/db.js iteration97 standard drizzle dev logger callback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('executes standard logger logQuery callback in development mode', () => {
    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
    });

    const drizzleModule = cjsRequire('drizzle-orm/node-postgres') as {
      drizzle: ReturnType<typeof vi.fn>;
    };
    const drizzleCalls = drizzleModule.drizzle.mock.calls;
    const drizzleOptions = drizzleCalls[0]?.[0] as { logger?: { logQuery: (query: string, params: unknown[]) => void } };

    expect(drizzleOptions.logger).toBeDefined();
    drizzleOptions.logger?.logQuery('SELECT 1', []);
  });
});
