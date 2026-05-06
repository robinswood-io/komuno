import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration47 ws import branch attempts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('loads with ws mocked as CommonJS object (no __esModule)', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
      wsExports: { socketCtor: 'cjs-ws' },
    });

    expect(setup.neonPools).toHaveLength(1);
    expect(setup.neonPools[0]?.options).toMatchObject({
      allowExitOnIdle: false,
      min: 5,
      max: 20,
    });
  });
});

