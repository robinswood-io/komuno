import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration94 closePool catch branch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('handles pool.end rejection during signal-triggered shutdown', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
    });

    setup.pgPools[0]?.end.mockRejectedValueOnce(new Error('close-failure'));

    const processOnMock = vi.mocked(process.on);
    const sigtermEntry = processOnMock.mock.calls.find(([signal]) => signal === 'SIGTERM');
    const handler = sigtermEntry?.[1];
    expect(typeof handler).toBe('function');

    await (handler as () => Promise<void>)();

    expect(setup.pgPools[0]?.end).toHaveBeenCalledTimes(1);
  });
});
