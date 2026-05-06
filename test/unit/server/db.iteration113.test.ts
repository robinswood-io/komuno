import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

type DrizzleModule = { drizzle: ReturnType<typeof vi.fn> };

const cjsRequire = createRequire(import.meta.url);

describe('server/db.js iteration113 standard drizzle branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('selects node-postgres drizzle builder when provider is standard', () => {
    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    const neonDrizzle = cjsRequire('drizzle-orm/neon-serverless') as DrizzleModule;
    const pgDrizzle = cjsRequire('drizzle-orm/node-postgres') as DrizzleModule;

    expect(pgDrizzle.drizzle).toHaveBeenCalledTimes(1);
    expect(neonDrizzle.drizzle).not.toHaveBeenCalled();
  });
});
