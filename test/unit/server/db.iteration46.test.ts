import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration46 helper-runtime branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('loads when schema export contains accessor properties', () => {
    const schemaExports: Record<string, unknown> = { plain: 1 };
    Object.defineProperty(schemaExports, 'computed', {
      enumerable: true,
      get() {
        return 'value';
      },
    });

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      schemaExports,
    });

    expect(setup.pgPools).toHaveLength(1);
    expect(setup.pgPools[0]?.registeredEvents).toEqual(['connect', 'remove', 'error']);
  });
});

