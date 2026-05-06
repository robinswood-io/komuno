import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration76 standard pool wiring', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('wires standard provider pool with testing bounds', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    expect(setup.pgPools[0]?.options).toMatchObject({
      max: 2,
      min: 1,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      application_name: 'cjd-amiens-app',
    });
  });
});
