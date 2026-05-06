import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration48 provider detection edges', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('treats non-neon hostnames as standard provider', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@neon-tech.local:5432/appdb',
      nodeEnv: 'production',
    });

    expect(setup.pgPools).toHaveLength(1);
    expect(setup.neonPools).toHaveLength(0);
  });

  it('detects neon provider only when URL contains neon.tech', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@db.neon.tech/appdb',
      nodeEnv: 'production',
    });

    expect(setup.neonPools).toHaveLength(1);
    expect(setup.pgPools).toHaveLength(0);
  });
});

