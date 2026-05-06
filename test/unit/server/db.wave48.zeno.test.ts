import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave48 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('logs shutdown start before logging pool.end failure on SIGTERM', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });
    const failure = new Error('term-close-fail');
    setup.pgPools[0].end.mockRejectedValueOnce(failure);

    const processOnMock = vi.mocked(process.on);
    const sigtermHandler = processOnMock.mock.calls.find(([signal]) => signal === 'SIGTERM')?.[1] as
      | (() => Promise<void>)
      | undefined;

    await sigtermHandler?.();

    expect(consoleLogSpy).toHaveBeenCalledWith('[DB] Fermeture gracieuse du pool de connexions...');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[DB] Erreur lors de la fermeture du pool:', failure);
  });
});

