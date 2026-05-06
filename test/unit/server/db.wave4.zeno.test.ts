import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave4 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('does not close pool twice when SIGTERM handler runs twice', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const processOnMock = vi.mocked(process.on);
    const sigtermHandler = processOnMock.mock.calls.find(([eventName]) => eventName === 'SIGTERM')?.[1] as
      | (() => Promise<void>)
      | undefined;

    expect(sigtermHandler).toBeDefined();

    await sigtermHandler?.();
    await sigtermHandler?.();

    expect(setup.pgPools[0].end).toHaveBeenCalledTimes(1);
  });
});
