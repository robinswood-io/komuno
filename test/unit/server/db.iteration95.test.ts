import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration95 closePool idempotent branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('does not call pool.end twice when shutdown handler is invoked twice', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    const processOnMock = vi.mocked(process.on);
    const sigintEntry = processOnMock.mock.calls.find(([signal]) => signal === 'SIGINT');
    const handler = sigintEntry?.[1];
    expect(typeof handler).toBe('function');

    const closePool = handler as () => Promise<void>;
    await closePool();
    await closePool();

    expect(setup.pgPools[0]?.end).toHaveBeenCalledTimes(1);
  });
});
