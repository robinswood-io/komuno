import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave16 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('closes pool only once across SIGTERM then SIGINT handlers', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const processOnMock = vi.mocked(process.on);
    const sigtermHandler = processOnMock.mock.calls.find(([signal]) => signal === 'SIGTERM')?.[1] as
      | (() => Promise<void>)
      | undefined;
    const sigintHandler = processOnMock.mock.calls.find(([signal]) => signal === 'SIGINT')?.[1] as
      | (() => Promise<void>)
      | undefined;

    expect(sigtermHandler).toBeDefined();
    expect(sigintHandler).toBeDefined();

    await sigtermHandler?.();
    await sigintHandler?.();

    expect(setup.pgPools[0].end).toHaveBeenCalledTimes(1);
  });
});
