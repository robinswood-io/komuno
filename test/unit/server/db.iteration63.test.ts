import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration63 missing DATABASE_URL (empty string)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('throws when DATABASE_URL is an empty string', () => {
    expect(() =>
      loadDbJsModule({
        databaseUrl: '',
        nodeEnv: 'testing',
      }),
    ).toThrow('DATABASE_URL must be set. Did you forget to provision a database?');
  });
});
