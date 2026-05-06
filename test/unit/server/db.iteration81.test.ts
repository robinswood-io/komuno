import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration81 dbResilience executeQuery callback execution', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('executes callback through resilience layer exactly once', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    const queryFn = vi.fn(async () => ({ ok: 1 }));
    const result = await setup.module.runDbQuery(queryFn, 'normal');

    expect(result).toEqual({ ok: 1 });
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(setup.executeQueryMock).toHaveBeenCalledTimes(1);
  });
});
