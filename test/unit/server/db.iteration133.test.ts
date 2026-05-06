import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

type DrizzleArg = { schema?: Record<string, unknown> };
type DrizzleModule = { drizzle: ReturnType<typeof vi.fn<[DrizzleArg], unknown>> };

const cjsRequire = createRequire(import.meta.url);

describe('server/db.js iteration133 __importStar early return on __esModule schema', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('keeps schema reference unchanged when schema module is already __esModule', () => {
    const esModuleSchema = {
      __esModule: true,
      users: { tableName: 'users' },
    };

    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      schemaExports: esModuleSchema,
    });

    const drizzlePg = cjsRequire('drizzle-orm/node-postgres') as DrizzleModule;
    const config = drizzlePg.drizzle.mock.calls[0]?.[0];

    expect(config.schema).toBe(esModuleSchema as unknown as Record<string, unknown>);
    expect(config.schema?.default).toBeUndefined();
  });
});
