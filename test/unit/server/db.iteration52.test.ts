import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration52 standard provider bootstrap', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('loads with standard provider when DATABASE_URL is present', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    expect(setup.pgPools).toHaveLength(1);
    expect(setup.neonPools).toHaveLength(0);
  });
});
