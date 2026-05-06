import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave24 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses standard development pool sizing and timeouts', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
    });

    const options = setup.pgPools[0].options;
    expect(options.min).toBe(2);
    expect(options.max).toBe(5);
    expect(options.connectionTimeoutMillis).toBe(10000);
    expect(options.idleTimeoutMillis).toBe(60000);
    expect(options.application_name).toBe('cjd-amiens-app');
  });
});

