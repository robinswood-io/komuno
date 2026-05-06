import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration53 development pool config', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses development pool sizing for non production/non testing env', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
    });

    const options = setup.pgPools[0]?.options;
    expect(options).toMatchObject({
      min: 2,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
    });
  });
});
