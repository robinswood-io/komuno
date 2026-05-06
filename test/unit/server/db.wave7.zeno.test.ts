import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave7 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('logs successful graceful shutdown when SIGINT handler closes pool', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const processOnMock = vi.mocked(process.on);
    const sigintHandler = processOnMock.mock.calls.find(([eventName]) => eventName === 'SIGINT')?.[1] as
      | (() => Promise<void>)
      | undefined;

    expect(sigintHandler).toBeDefined();

    await sigintHandler?.();

    expect(setup.pgPools[0].end).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith('[DB] Fermeture gracieuse du pool de connexions...');
    expect(consoleLogSpy).toHaveBeenCalledWith('[DB] Pool fermé');
  });
});
