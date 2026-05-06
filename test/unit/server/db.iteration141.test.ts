import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js iteration141 closePool catch branch via signal handler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('logs closePool error when pool.end rejects from SIGINT handler', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const failure = new Error('pool-end-failed');
    setup.pgPools[0].end.mockRejectedValueOnce(failure);

    const processOnMock = vi.mocked(process.on);
    const sigintHandler = processOnMock.mock.calls.find(([eventName]) => eventName === 'SIGINT')?.[1] as
      | (() => Promise<void>)
      | undefined;

    expect(sigintHandler).toBeDefined();
    await sigintHandler?.();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[DB] Erreur lors de la fermeture du pool:', failure);
  });
});
