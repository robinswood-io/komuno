import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

type DrizzleCallArg = { logger?: false | { logQuery: (query: string, params: unknown) => void } };
type DrizzleModule = { drizzle: ReturnType<typeof vi.fn<[DrizzleCallArg], unknown>> };

const cjsRequire = createRequire(import.meta.url);

describe('server/db.js iteration115 neon production logger false branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('passes logger=false to neon drizzle outside development', () => {
    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
    });

    const neonDrizzle = cjsRequire('drizzle-orm/neon-serverless') as DrizzleModule;
    const arg = neonDrizzle.drizzle.mock.calls[0]?.[0];

    expect(arg?.logger).toBe(false);
  });
});
