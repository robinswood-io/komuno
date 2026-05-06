import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration75 neon config wiring', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('wires neon provider pool with production pool bounds', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
    });

    expect(setup.neonPools[0]?.options).toMatchObject({
      max: 20,
      min: 5,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 600000,
      maxUses: 10000,
    });
  });
});
