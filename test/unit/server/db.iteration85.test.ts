import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration85 non-development pool listeners', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('registers only error listener for standard provider outside development', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    expect(setup.pgPools).toHaveLength(1);
    expect(setup.pgPools[0]?.registeredEvents).toEqual(['error']);
  });
});
