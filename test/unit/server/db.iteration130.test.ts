import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration130 runDbQuery executes provided function', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns queryFn value through resilience wrapper with quick profile', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const result = await setup.module.runDbQuery(async () => ({ ok: 'quick' }), 'quick');

    expect(result).toEqual({ ok: 'quick' });
    expect(setup.executeQueryMock).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 2000, retry: false },
    );
  });
});
