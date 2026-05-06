import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration138 non-development listener branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('does not register connect/remove listeners outside development', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    const pool = setup.pgPools[0];
    expect(pool.registeredEvents).toContain('error');
    expect(pool.registeredEvents).not.toContain('connect');
    expect(pool.registeredEvents).not.toContain('remove');
  });
});
