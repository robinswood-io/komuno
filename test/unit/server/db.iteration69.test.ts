import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration69 runDbQuery returns query result', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns resolved value from query callback', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    const result = await setup.module.runDbQuery(async () => ({ id: 'ok', size: 2 }), 'complex');
    expect(result).toEqual({ id: 'ok', size: 2 });
  });
});
