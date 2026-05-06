import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration86 runDbQuery quick profile forwarding', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('forwards quick timeout profile to resilience layer', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    await setup.module.runDbQuery(async () => 'ok', 'quick');

    expect(setup.executeQueryMock).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 2000, retry: false },
    );
  });
});
