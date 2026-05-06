import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave39 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('closes pool once when SIGINT then SIGTERM are triggered', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const processOnMock = vi.mocked(process.on);
    const sigintHandler = processOnMock.mock.calls.find(([signal]) => signal === 'SIGINT')?.[1] as
      | (() => Promise<void>)
      | undefined;
    const sigtermHandler = processOnMock.mock.calls.find(([signal]) => signal === 'SIGTERM')?.[1] as
      | (() => Promise<void>)
      | undefined;

    expect(sigintHandler).toBeDefined();
    expect(sigtermHandler).toBeDefined();

    await sigintHandler?.();
    await sigtermHandler?.();

    expect(setup.pgPools[0].end).toHaveBeenCalledTimes(1);
  });
});

