import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration60 missing DATABASE_URL guard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('throws when DATABASE_URL is not set', () => {
    expect(() => loadDbJsModule({ nodeEnv: 'testing' })).toThrow(
      'DATABASE_URL must be set. Did you forget to provision a database?',
    );
  });
});
