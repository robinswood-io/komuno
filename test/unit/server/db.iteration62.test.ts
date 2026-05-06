import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration62 missing DATABASE_URL (undefined)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('throws when DATABASE_URL is undefined', () => {
    expect(() => loadDbJsModule({ nodeEnv: 'testing' })).toThrow(
      'DATABASE_URL must be set. Did you forget to provision a database?',
    );
  });
});
