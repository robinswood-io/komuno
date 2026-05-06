import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration72 __importStar binding with writable schema export', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('loads db.js when schema mock includes enumerable writable exports', () => {
    const schemaExports: Record<string, unknown> = {};
    Object.defineProperty(schemaExports, 'entityA', {
      value: { name: 'A' },
      enumerable: true,
      writable: true,
      configurable: true,
    });

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      schemaExports,
    });

    expect(setup.module.db).toBeDefined();
  });
});
