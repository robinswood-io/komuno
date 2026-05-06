import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration83 neon development event registration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('registers connect/remove/error events for neon pool in development', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'development',
    });

    expect(setup.neonPools).toHaveLength(1);
    expect(setup.neonPools[0]?.registeredEvents).toEqual(['connect', 'remove', 'error']);
  });
});
