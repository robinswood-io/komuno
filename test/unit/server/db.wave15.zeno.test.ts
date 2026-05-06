import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave15 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('sets pg-specific application_name option for standard provider pool', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      stats: {
        totalCount: 1,
        idleCount: 1,
        waitingCount: 0,
      },
    });

    expect(setup.pgPools).toHaveLength(1);
    expect(setup.neonPools).toHaveLength(0);

    const options = setup.pgPools[0].options;
    expect(options.application_name).toBe('cjd-amiens-app');
    expect(options.min).toBe(1);
    expect(options.max).toBe(2);
    expect(options.connectionTimeoutMillis).toBe(5000);
  });
});
