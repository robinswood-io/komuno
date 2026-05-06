import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave2 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('throws when DATABASE_URL is missing during provider detection', () => {
    expect(() =>
      loadDbJsModule({
        nodeEnv: 'development',
      })
    ).toThrowError('DATABASE_URL must be set. Did you forget to provision a database?');
  });
});
