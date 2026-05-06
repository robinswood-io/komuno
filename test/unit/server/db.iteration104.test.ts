import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration104 runDbQuery default argument branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('uses normal profile when profile argument is omitted', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    await setup.module.runDbQuery(async () => 'default-profile');

    expect(setup.executeQueryMock).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 5000, retry: true },
    );
  });
});
