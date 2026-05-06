import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave37 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('does not set pg-only application_name option on neon pools', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgres://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
    });

    const options = setup.neonPools[0].options;
    expect(options.application_name).toBeUndefined();
    expect(options.allowExitOnIdle).toBe(false);
  });
});

