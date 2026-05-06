import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

type DrizzleModule = { drizzle: ReturnType<typeof vi.fn> };

const cjsRequire = createRequire(import.meta.url);

describe('server/db.js iteration112 neon drizzle branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('selects neon drizzle builder when provider is neon', () => {
    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
    });

    const neonDrizzle = cjsRequire('drizzle-orm/neon-serverless') as DrizzleModule;
    const pgDrizzle = cjsRequire('drizzle-orm/node-postgres') as DrizzleModule;

    expect(neonDrizzle.drizzle).toHaveBeenCalledTimes(1);
    expect(pgDrizzle.drizzle).not.toHaveBeenCalled();
  });
});
