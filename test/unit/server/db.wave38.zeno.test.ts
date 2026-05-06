import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave38 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('logs pool close error when pool.end throws synchronously from SIGTERM', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const failure = new Error('sync-end-error');
    setup.pgPools[0].end.mockImplementationOnce(() => {
      throw failure;
    });

    const processOnMock = vi.mocked(process.on);
    const sigtermHandler = processOnMock.mock.calls.find(([signal]) => signal === 'SIGTERM')?.[1] as
      | (() => Promise<void>)
      | undefined;

    expect(sigtermHandler).toBeDefined();
    await sigtermHandler?.();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[DB] Erreur lors de la fermeture du pool:', failure);
  });
});

