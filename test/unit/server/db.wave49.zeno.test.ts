import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave49 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('keeps closePool idempotent after first SIGTERM failure then SIGINT retry', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });
    setup.pgPools[0].end.mockRejectedValueOnce(new Error('first-failure'));

    const processOnMock = vi.mocked(process.on);
    const sigtermHandler = processOnMock.mock.calls.find(([signal]) => signal === 'SIGTERM')?.[1] as
      | (() => Promise<void>)
      | undefined;
    const sigintHandler = processOnMock.mock.calls.find(([signal]) => signal === 'SIGINT')?.[1] as
      | (() => Promise<void>)
      | undefined;

    await sigtermHandler?.();
    await sigintHandler?.();

    expect(setup.pgPools[0].end).toHaveBeenCalledTimes(1);
  });
});

