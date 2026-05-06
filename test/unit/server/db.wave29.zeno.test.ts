import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanupDbHarness, loadDbJsModule } from './db.iteration-helper';

describe('server/db.js wave29 zeno branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupDbHarness();
  });

  it('exposes SIGTERM and SIGINT shutdown handlers via process.on', () => {
    loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const processOnMock = vi.mocked(process.on);
    expect(processOnMock).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(processOnMock).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });
});

