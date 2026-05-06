import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration84 standard development event registration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('registers connect/remove/error events for standard pool in development', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
    });

    expect(setup.pgPools).toHaveLength(1);
    expect(setup.pgPools[0]?.registeredEvents).toEqual(['connect', 'remove', 'error']);
  });
});
