import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration73 __importStar binding with __esModule schema export', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('loads db.js when schema mock marks __esModule and uses getter exports', () => {
    const schemaExports: Record<string, unknown> = { __esModule: true };
    Object.defineProperty(schemaExports, 'entityB', {
      enumerable: true,
      get: () => ({ name: 'B' }),
    });

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      schemaExports,
    });

    expect(setup.module.db).toBeDefined();
  });
});
