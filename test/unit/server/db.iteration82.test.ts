import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration82 DATABASE_URL guard branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() =>
      loadDbJsModule({
        databaseUrl: undefined,
        nodeEnv: 'testing',
      }),
    ).toThrowError('DATABASE_URL must be set. Did you forget to provision a database?');
  });
});
