import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration108 closePool catch path', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('catches pool.end failure on SIGTERM shutdown', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    setup.pgPools[0]?.end.mockRejectedValueOnce(new Error('end-failed'));
    const processOnMock = vi.mocked(process.on);
    const sigtermHandler = processOnMock.mock.calls.find(([signal]) => signal === 'SIGTERM')?.[1];

    expect(typeof sigtermHandler).toBe('function');
    await (sigtermHandler as () => Promise<void>)();
    expect(setup.pgPools[0]?.end).toHaveBeenCalledTimes(1);
  });
});
