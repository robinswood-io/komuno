import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration120 closePool early-return branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('returns early on second SIGTERM invocation and calls pool.end once', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    const processOnMock = vi.mocked(process.on);
    const sigtermHandler = processOnMock.mock.calls.find(([signal]) => signal === 'SIGTERM')?.[1];

    expect(typeof sigtermHandler).toBe('function');

    const closePool = sigtermHandler as () => Promise<void>;
    await closePool();
    await closePool();

    expect(setup.pgPools[0]?.end).toHaveBeenCalledTimes(1);
  });
});
