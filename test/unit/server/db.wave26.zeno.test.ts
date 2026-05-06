import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave26 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('keeps pg-specific application_name in production standard pool', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    const options = setup.pgPools[0].options;
    expect(options.min).toBe(5);
    expect(options.max).toBe(20);
    expect(options.connectionTimeoutMillis).toBe(30000);
    expect(options.idleTimeoutMillis).toBe(600000);
    expect(options.application_name).toBe('cjd-amiens-app');
  });
});

